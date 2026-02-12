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
            // Flags internos (no persistir en modelos)
            this._pEvaluadoresDialog = null;
            this._bRestoringSelections = false;

            this.getBaseURL();

            // Modelo Evaluadores (Dialog)
            this.getView().setModel(new JSONModel({
                Evaluadores: [],
                EvaluadoresCompletos: [],
                SeleccionesGuardadas: [], // Legajos seleccionados
                FilterValue: "",
                Busy: false
            }), "Evaluadores");

            // Modelo tabla principal
            this.getView().setModel(new JSONModel({
                EvaluadoresModel: []
            }), "EvaluadoresModel");

            // Modelo filtros
            if (!this.getView().getModel("FiltrosModel")) {
                this.getView().setModel(new JSONModel({}), "FiltrosModel");
            }
        },

        // ============================================================
        // Base URL (igual que tenías)
        // ============================================================
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

        // ============================================================
        // Servicios / carga
        // ============================================================
        loadEvaluadores: function (filter) {
            var oModel = this.getView().getModel("Evaluadores");
            oModel.setProperty("/Busy", true);

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

            var that = this;
            setTimeout(function () {
                that._restoreSelectionsToList();
            }, 0);
        },

        onErrorLoadEvaluadores: function (error) {
            console.error("Error al cargar evaluadores:", error);
            MessageBoxHelper.showAlert("Error", "No se pudieron cargar los evaluadores. Por favor, intente nuevamente.");

            var oModel = this.getView().getModel("Evaluadores");
            if (oModel) {
                oModel.setProperty("/Busy", false);
            }
        },

        // ============================================================
        // Favoritos / orden tabla principal
        // ============================================================
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

        onToggleFavorito: function (oEvent) {
            var oButton = oEvent.getSource();
            var oListItem = oButton.getParent();
            var oContext = oListItem.getBindingContext("EvaluadoresModel");
            if (!oContext) return;

            var oEvaluador = oContext.getObject();
            if (oEvaluador.Favorito === undefined) {
                oEvaluador.Favorito = false;
            }

            var oModel = this.getView().getModel("EvaluadoresModel");
            var aEvaluadores = oModel.getProperty("/EvaluadoresModel") || [];

            var iFavoritosCount = aEvaluadores.filter(function (e) { return e.Favorito === true; }).length;

            if (!oEvaluador.Favorito && iFavoritosCount >= 3) {
                MessageBoxHelper.showAlert("Favoritos", "Solo puede tener hasta 3 evaluadores favoritos. Desmarque uno antes de agregar otro.");
                return;
            }

            oEvaluador.Favorito = !oEvaluador.Favorito;

            oModel.setProperty("/EvaluadoresModel", this._ordenarEvaluadoresPorFavoritos(aEvaluadores));
            oModel.updateBindings(true);
        },

        onPressDeleteEvaluador: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oCtx = oItem && oItem.getBindingContext("EvaluadoresModel");
            if (!oCtx) return;

            var oObj = oCtx.getObject();
            var oModel = this.getView().getModel("EvaluadoresModel");
            var aEvaluadores = (oModel.getProperty("/EvaluadoresModel") || []).slice();

            // Buscar por Puser (Legajo) para no depender del formato del path
            var i = aEvaluadores.findIndex(function (e) { return e.Puser === oObj.Puser; });
            if (i === -1) return;

            aEvaluadores.splice(i, 1);
            aEvaluadores.forEach(function (e) {
                if (e.Favorito === undefined) e.Favorito = false;
            });

            oModel.setProperty("/EvaluadoresModel", this._ordenarEvaluadoresPorFavoritos(aEvaluadores));
            oModel.updateBindings(true);
        },

        // ============================================================
        // Fragment (Dialog Evaluadores)
        // Archivo: webapp/fragments/EvaluadoresDialog.fragment.xml
        // name: transener.equipoevaluador.fragments.EvaluadoresDialog
        // ============================================================
        _getEvaluadoresDialog: function () {
            if (!this._pEvaluadoresDialog) {
                this._pEvaluadoresDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "transener.equipoevaluador.fragments.EvaluadoresDialog",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    // asegurar modelo nombrado
                    oDialog.setModel(this.getView().getModel("Evaluadores"), "Evaluadores");
                    return oDialog;
                }.bind(this));
            }
            return this._pEvaluadoresDialog;
        },

        onDialogEvaluador: async function () {
            var oModel = this.getView().getModel("Evaluadores");
            oModel.setProperty("/Busy", true);

            var aAll = oModel.getProperty("/EvaluadoresCompletos") || [];
            if (aAll.length === 0) {
                this.loadEvaluadores("");
            } else {
                oModel.setProperty("/Evaluadores", aAll);
                oModel.setProperty("/Busy", false);
            }

            const oDialog = await this._getEvaluadoresDialog();
            oDialog.open();

            var that = this;
            setTimeout(function () {
                that._restoreSelectionsToList();
            }, 0);
        },

        onCancelEvaluadoresDialog: async function () {
            const oDialog = await this._getEvaluadoresDialog();
            oDialog.close();
        },

        onAfterCloseEvaluadoresDialog: function () {
            var oSearch = this.byId("searchEvaluadores");
            if (oSearch) {
                oSearch.setValue("");
            }
        },

        // ============================================================
        // Search en fragment (List) - filtra local sin perder selecciones
        // ============================================================
        onSearchEvaluadores: function (oEvent) {
            var oModel = this.getView().getModel("Evaluadores");
            var oList = this.byId("idList");
            if (!oModel || !oList) return;

            var s = oEvent.getParameter("newValue");
            if (s === undefined) s = oEvent.getParameter("query");
            s = (s || "").toString().trim();

            // snapshot de selecciones para que nunca se pierdan al limpiar con X
            var aSelSnapshot = (oModel.getProperty("/SeleccionesGuardadas") || []).slice();

            var aAll = oModel.getProperty("/EvaluadoresCompletos") || [];

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

            var that = this;
            setTimeout(function () {
                // restaurar snapshot y re-seleccionar items visibles
                oModel.setProperty("/SeleccionesGuardadas", aSelSnapshot);
                that._restoreSelectionsToList();
            }, 0);
        },

        // ============================================================
        // Selección en fragment (List): sincronizar desde la List para que el contador se actualice
        // ============================================================
        onSelectionChangeEvaluadores: function (oEvent) {
            if (this._bRestoringSelections) return;

            var oList = oEvent.getSource();
            var oModel = this.getView().getModel("Evaluadores");
            if (!oModel || !oList) return;

            // Obtener todos los contextos seleccionados (respeta filtro y multi-selección)
            var aContexts = oList.getSelectedContexts(true) || [];
            var aLegajos = [];
            aContexts.forEach(function (oCtx) {
                if (!oCtx) return;
                var oObj = oCtx.getObject();
                if (oObj && oObj.Legajo) aLegajos.push(oObj.Legajo);
            });

            // Asignar siempre un array nuevo para que el modelo dispare cambio y el binding del contador se actualice
            oModel.setProperty("/SeleccionesGuardadas", aLegajos.slice());
        },

        _restoreSelectionsToList: function () {
            var oModel = this.getView().getModel("Evaluadores");
            var oList = this.byId("idList");
            if (!oModel || !oList) return;

            var aSel = oModel.getProperty("/SeleccionesGuardadas") || [];

            this._bRestoringSelections = true;
            try {
                oList.removeSelections(true);

                if (!aSel.length) return;

                oList.getItems().forEach(function (oItem) {
                    var oCtx = oItem.getBindingContext("Evaluadores");
                    if (!oCtx) return;
                    var oObj = oCtx.getObject();
                    if (oObj && oObj.Legajo && aSel.indexOf(oObj.Legajo) !== -1) {
                        oList.setSelectedItem(oItem, true);
                    }
                });
            } finally {
                var that = this;
                setTimeout(function () { that._bRestoringSelections = false; }, 0);
            }
        },

        // ============================================================
        // Aceptar: agregar a tabla principal según SeleccionesGuardadas
        // ============================================================
        onAcceptEvaluadoresDialog: function () {
            var oEvalModel = this.getView().getModel("EvaluadoresModel");
            var oModel = this.getView().getModel("Evaluadores");
            if (!oEvalModel || !oModel) return;

            var aSelLegajos = oModel.getProperty("/SeleccionesGuardadas") || [];
            if (!aSelLegajos.length) {
                MessageBoxHelper.showAlert("Equipo Evaluador", "Debe seleccionar al menos un evaluador.");
                return;
            }

            var aAll = oModel.getProperty("/EvaluadoresCompletos") || [];
            var aActuales = oEvalModel.getProperty("/EvaluadoresModel") || [];

            aSelLegajos.forEach(function (legajo) {
                var oObj = aAll.find(function (e) { return e.Legajo === legajo; });
                if (!oObj) return;

                var bExiste = aActuales.some(function (e) { return e.Puser === legajo; });
                if (bExiste) return;

                var sNombreCompleto = ((oObj.Nombre || "").trim() + " " + (oObj.Apellido || "").trim()).trim();

                aActuales.push({
                    Correo: oObj.Correo || "",
                    Nombre: sNombreCompleto,
                    Puser: legajo,
                    Favorito: false
                });
            });

            oEvalModel.setProperty("/EvaluadoresModel", this._ordenarEvaluadoresPorFavoritos(aActuales));
            oEvalModel.updateBindings(true);

            // limpiar selección del diálogo para la próxima vez que se abra
            oModel.setProperty("/SeleccionesGuardadas", []);

            // cerrar dialog
            this.onCancelEvaluadoresDialog();

            // limpiar campos del form
            var oFiltrosModel = this.getView().getModel("FiltrosModel");
            if (oFiltrosModel) {
                oFiltrosModel.setProperty("/Puser", "");
                oFiltrosModel.setProperty("/Nombre", "");
                oFiltrosModel.updateBindings(true);
            }
        },

        // ============================================================
        // Helpers opcionales
        // ============================================================
        onSaveEvaluador: function () {
            var oEvaluadoresModel = this.getView().getModel("EvaluadoresModel");
            var aEvaluadores = oEvaluadoresModel.getProperty("/EvaluadoresModel") || [];

            if (aEvaluadores.length === 0) {
                MessageBoxHelper.showAlert("Equipo Evaluador", "No hay evaluadores seleccionados. Por favor, seleccione al menos un evaluador desde el diálogo.");
                return;
            }

            var aFavoritos = aEvaluadores.filter(function (e) { return e.Favorito === true; });
            var sMensaje = "Se guardaron " + aEvaluadores.length + " evaluador(es)";
            if (aFavoritos.length > 0) sMensaje += " (" + aFavoritos.length + " favorito(s))";
            sMensaje += ".";

            MessageBoxHelper.showAlert("Equipo Evaluador", sMensaje);
        },

        onExit: function () {
            
            if (this._pEvaluadoresDialog) {
                this._pEvaluadoresDialog.then(function (oDialog) {
                    if (oDialog && oDialog.destroy) oDialog.destroy();
                });
                this._pEvaluadoresDialog = null;
            }
        }

    });
});
