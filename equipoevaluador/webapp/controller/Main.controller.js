sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/Fragment",
  "transener/equipoevaluador/utils/MessageBoxHelper",
  "transener/equipoevaluador/utils/ModelHelper",
  "transener/equipoevaluador/services/RegionService",
  "transener/equipoevaluador/services/EvaluadoresService",
  "transener/equipoevaluador/services/PersonalInternoService"
], function (
  Controller,
  JSONModel,
  Fragment,
  MessageBoxHelper,
  ModelHelper,
  RegionService,
  EvaluadoresService,
  PersonalInternoService
) {
  "use strict";

  return Controller.extend("transener.equipoevaluador.controller.Main", {

    onInit: function () {
      // Flag para evitar pisar selecciones durante restore/refresh
      this._bSuppressSelectionSync = false;

      this.getBaseURL();

      // Modelo Evaluadores (dialog)
      var oModel = new JSONModel({
        Evaluadores: [],
        EvaluadoresCompletos: [],
        SeleccionesGuardadas: [], // Legajos seleccionados
        FilterValue: "",
        Busy: false
      });
      this.getView().setModel(oModel, "Evaluadores");

      // Modelo tabla principal
      this.getView().setModel(new JSONModel({ EvaluadoresModel: [] }), "EvaluadoresModel");

      // Modelo filtros
      if (!this.getView().getModel("FiltrosModel")) {
        this.getView().setModel(new JSONModel({}), "FiltrosModel");
      }
    },

    // =========================
    // Fragment loader
    // =========================
    _getEvaluadoresDialog: async function () {
      if (this._pEvaluadoresDialog) {
        return this._pEvaluadoresDialog;
      }

      this._pEvaluadoresDialog = Fragment.load({
        id: this.getView().getId(), // ✅ importante para byId
        name: "transener.equipoevaluador.fragments.EvaluadoresDialog",
        controller: this
      }).then(function (oDialog) {
        this.getView().addDependent(oDialog);
        return oDialog;
      }.bind(this));

      return this._pEvaluadoresDialog;
    },

    // =========================
    // Open dialog
    // =========================
    onDialogEvaluador: async function () {
      var oModel = this.getView().getModel("Evaluadores");
      oModel.setProperty("/Busy", true);

      // Cargar data si no está
      var aAll = oModel.getProperty("/EvaluadoresCompletos") || [];
      if (aAll.length === 0) {
        this.loadEvaluadores(); // onSuccessLoadEvaluadores apaga Busy y setea data
      } else {
        this._bSuppressSelectionSync = true;
        oModel.setProperty("/Evaluadores", aAll);
        oModel.setProperty("/FilterValue", "");
        oModel.setProperty("/Busy", false);
      }

      var oDialog = await this._getEvaluadoresDialog();
      oDialog.open();

      // Restaurar selección por Legajo
      var that = this;
      setTimeout(function () {
        that._restoreSelectionToUiTable();
      }, 0);
    },

    onCancelEvaluadoresDialog: async function () {
      var oDialog = await this._getEvaluadoresDialog();
      oDialog.close();
    },

    onAfterCloseEvaluadoresDialog: function () {
      // opcional: limpiar el search visual
      var oSearch = this.byId("searchEvaluadores");
      if (oSearch) oSearch.setValue("");

      // opcional: si querés que no “recuerde” al reabrir:
      // this.getView().getModel("Evaluadores").setProperty("/SeleccionesGuardadas", []);
    },

    // =========================
    // Row selection change (solo user)
    // =========================
   onRowSelectionChangeEvaluadores: function (oEvent) {
    if (this._bSuppressSelectionSync) return;

    // solo cuando realmente hubo interacción en la fila
    if (oEvent && oEvent.getParameter && oEvent.getParameter("userInteraction") === false) return;

    this._syncSelectionFromUiTable();
},


    _syncSelectionFromUiTable: function () {
      var oModel = this.getView().getModel("Evaluadores");
      var oTable = this.byId("uiTableEvaluador");
      if (!oModel || !oTable) return;

      var aSelIdx = oTable.getSelectedIndices() || [];
      var aLegajos = [];

      aSelIdx.forEach(function (iRow) {
        var oCtx = oTable.getContextByIndex(iRow);
        if (oCtx) {
          var oObj = oCtx.getObject();
          if (oObj && oObj.Legajo) aLegajos.push(oObj.Legajo);
        }
      });

      // dedupe
      aLegajos = aLegajos.filter(function (v, i, a) { return a.indexOf(v) === i; });
      oModel.setProperty("/SeleccionesGuardadas", aLegajos);
    },

   _restoreSelectionToUiTable: function (aLegajosOverride) {
    var oModel = this.getView().getModel("Evaluadores");
    var oTable = this.byId("uiTableEvaluador");
    if (!oModel || !oTable) return;

    var aLegajos = Array.isArray(aLegajosOverride)
        ? aLegajosOverride
        : (oModel.getProperty("/SeleccionesGuardadas") || []);

    // No tocamos _bSuppressSelectionSync acá: lo maneja el caller (search / load)
    oTable.clearSelection();

    if (!aLegajos.length) return;

    var oBinding = oTable.getBinding("rows");
    var iTotal = oBinding ? oBinding.getLength() : 0;

    for (var i = 0; i < iTotal; i++) {
        var oCtx = oTable.getContextByIndex(i);
        if (!oCtx) continue;

        var oObj = oCtx.getObject();
        if (oObj && oObj.Legajo && aLegajos.indexOf(oObj.Legajo) !== -1) {
            oTable.addSelectionInterval(i, i);
        }
    }
},

   onSearchEvaluadoresUiTable: function (oEvent) {
    var oModel = this.getView().getModel("Evaluadores");
    var oTable = this.byId("uiTableEvaluador");
    if (!oModel || !oTable) return;

    var s = "";
    if (oEvent.getParameter) {
        s = oEvent.getParameter("newValue");
        if (s === undefined) s = oEvent.getParameter("query");
    }
    s = (s || "").toString().trim();

    var aAll = oModel.getProperty("/EvaluadoresCompletos") || [];

    // ✅ Guardar una copia INMUTABLE de lo seleccionado ANTES de tocar data
    var aLegajosSnapshot = (oModel.getProperty("/SeleccionesGuardadas") || []).slice();

    // ✅ Bloquear sync durante TODO el refresh de filas
    this._bSuppressSelectionSync = true;

    // Actualizar dataset
    if (!s) {
        oModel.setProperty("/Evaluadores", aAll);
        oModel.setProperty("/FilterValue", "");
    } else {
        var q = s.toLowerCase();
        var aFiltered = aAll.filter(function (e) {
            var n = (e.Nombre || "").toLowerCase();
            var a = (e.Apellido || "").toLowerCase();
            var l = (e.Legajo || "").toLowerCase();
            return n.indexOf(q) !== -1 || a.indexOf(q) !== -1 || l.indexOf(q) !== -1;
        });
        oModel.setProperty("/Evaluadores", aFiltered);
        oModel.setProperty("/FilterValue", s);
    }

    // ✅ Esperar a que la tabla termine de refrescar filas
    var that = this;
    oTable.detachRowsUpdated(this._fnRowsUpdatedRestore, this);

    this._fnRowsUpdatedRestore = function () {
        // restaurar usando el snapshot (aunque /SeleccionesGuardadas se haya tocado)
        that._restoreSelectionToUiTable(aLegajosSnapshot);
        // recién ahora permitimos sync
        that._bSuppressSelectionSync = false;

        // opcional: devolver el snapshot al modelo (para garantizar consistencia)
        oModel.setProperty("/SeleccionesGuardadas", aLegajosSnapshot);
    };

    oTable.attachEventOnce("rowsUpdated", this._fnRowsUpdatedRestore, this);
},


    // =========================
    // Accept
    // =========================
    onAcceptEvaluadoresDialog: function () {
      var oTable = this.byId("uiTableEvaluador");
      var oEvalModel = this.getView().getModel("EvaluadoresModel");

      if (!oTable || !oEvalModel) {
        MessageBoxHelper.showAlert("Equipo Evaluador", "No se pudo acceder a la tabla/modelos.");
        return;
      }

      var aSelIdx = oTable.getSelectedIndices() || [];
      if (aSelIdx.length === 0) {
        MessageBoxHelper.showAlert("Equipo Evaluador", "Debe seleccionar al menos un evaluador.");
        return;
      }

      var aActuales = oEvalModel.getProperty("/EvaluadoresModel") || [];
      var that = this;

      aSelIdx.forEach(function (iRow) {
        var oCtx = oTable.getContextByIndex(iRow);
        if (!oCtx) return;

        var oObj = oCtx.getObject();
        if (!oObj || !oObj.Legajo) return;

        var sLegajo = oObj.Legajo;
        var sNombreCompleto = ((oObj.Nombre || "").trim() + " " + (oObj.Apellido || "").trim()).trim();

        var bExiste = aActuales.some(function (e) { return e.Puser === sLegajo; });
        if (!bExiste) {
          aActuales.push({
            Correo: oObj.Correo || "",
            Nombre: sNombreCompleto,
            Puser: sLegajo,
            Favorito: false
          });
        }
      });

      oEvalModel.setProperty("/EvaluadoresModel", that._ordenarEvaluadoresPorFavoritos(aActuales));
      oEvalModel.updateBindings(true);

      this.onCancelEvaluadoresDialog();

      var oFiltrosModel = this.getView().getModel("FiltrosModel");
      if (oFiltrosModel) {
        oFiltrosModel.setProperty("/Puser", "");
        oFiltrosModel.setProperty("/Nombre", "");
        oFiltrosModel.updateBindings(true);
      }
    },

    // =========================
    // Callbacks service
    // =========================
    loadEvaluadores: function (filter) {
    var oModel = this.getView().getModel("Evaluadores");
    if (oModel) {
        oModel.setProperty("/Busy", true);
    }

    PersonalInternoService.LoadSearch(
        (filter || ""),
        jQuery.proxy(this.onSuccessLoadEvaluadores, this),
        jQuery.proxy(this.onErrorLoadEvaluadores, this)
    );
},

onSuccessLoadEvaluadores: function (response) {
    var aEvaluadores = (response && response.results) ? response.results : [];
    var oModel = this.getView().getModel("Evaluadores");

    oModel.setProperty("/EvaluadoresCompletos", aEvaluadores);
    oModel.setProperty("/Evaluadores", aEvaluadores);
    oModel.setProperty("/Busy", false);

    var oTable = this.byId("uiTableEvaluador");
    if (!oTable) return;

    var aLegajosSnapshot = (oModel.getProperty("/SeleccionesGuardadas") || []).slice();
    this._bSuppressSelectionSync = true;

    var that = this;
    oTable.attachEventOnce("rowsUpdated", function () {
        that._restoreSelectionToUiTable(aLegajosSnapshot);
        that._bSuppressSelectionSync = false;
        oModel.setProperty("/SeleccionesGuardadas", aLegajosSnapshot);
    });
}
,

onErrorLoadEvaluadores: function (error) {
    console.error("Error al cargar evaluadores:", error);
    MessageBoxHelper.showAlert("Error", "No se pudieron cargar los evaluadores. Por favor, intente nuevamente.");

    var oModel = this.getView().getModel("Evaluadores");
    if (oModel) {
        oModel.setProperty("/Busy", false);
    }
},

  
    getBaseURL: function () {
      var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");

      var appModel = ModelHelper.getModel("appModel", this.getView());
      appModel.setData(appId);
      sap.ui.getCore().setModel(appModel, "appId");

      var appPath = appId.replaceAll(".", "/");
      var appModulePath = jQuery.sap.getModulePath(appPath);

      var jsonModel = sap.ui.getCore().getModel("appCurrentInfo");
      if (!jsonModel) {
        jsonModel = new JSONModel();
        jsonModel.setSizeLimit(9999);
        sap.ui.getCore().setModel(jsonModel, "appCurrentInfo");
      }

      jsonModel.setData({ appUrl: appModulePath });
      return appModulePath;
    },

    // ======== lo que ya tenías (favoritos / delete) =========
    _ordenarEvaluadoresPorFavoritos: function (aEvaluadores) {
      if (!aEvaluadores || aEvaluadores.length === 0) return aEvaluadores;
      var aOrdenados = aEvaluadores.slice();
      aOrdenados.sort(function (a, b) {
        var aFav = a.Favorito === true ? 1 : 0;
        var bFav = b.Favorito === true ? 1 : 0;
        if (aFav === bFav) return 0;
        return bFav - aFav;
      });
      return aOrdenados;
    },

    onPressDeleteEvaluador: function (oEvaluadorPath) {
      var oModel = this.getView().getModel("EvaluadoresModel");
      var aEvaluadores = oModel.getProperty("/EvaluadoresModel") || [];
      var index = parseInt(oEvaluadorPath.replace("/EvaluadoresModel/", ""), 10);

      if (index >= 0 && index < aEvaluadores.length) {
        aEvaluadores.splice(index, 1);
        aEvaluadores.forEach(function (e) { if (e.Favorito === undefined) e.Favorito = false; });
        oModel.setProperty("/EvaluadoresModel", this._ordenarEvaluadoresPorFavoritos(aEvaluadores));
        oModel.updateBindings(true);
      }
    }

  });
});
