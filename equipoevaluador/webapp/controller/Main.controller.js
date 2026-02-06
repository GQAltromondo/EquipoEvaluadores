sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",

    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Bar",
    "sap/m/SearchField",
    "sap/m/Label",
    "sap/m/Text",

    "sap/ui/table/Table",
    "sap/ui/table/Column",

    "transener/equipoevaluador/utils/MessageBoxHelper",
    "transener/equipoevaluador/utils/ModelHelper",
    "transener/equipoevaluador/services/RegionService",
    "transener/equipoevaluador/services/EvaluadoresService",
    "transener/equipoevaluador/services/PersonalInternoService"
], function (
    Controller,
    JSONModel,
    Dialog,
    Button,
    Bar,
    SearchField,
    Label,
    Text,
    UiTable,
    UiColumn,
    MessageBoxHelper,
    ModelHelper,
    RegionService,
    EvaluadoresService,
    PersonalInternoService
) {
    "use strict";

    return Controller.extend("transener.equipoevaluador.controller.Main", {

        onInit: function () {
            // ✅ Flag para NO pisar selecciones cuando la tabla cambia por filtro/refresh
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
            var oEvaluadoresModel = new JSONModel({ EvaluadoresModel: [] });
            this.getView().setModel(oEvaluadoresModel, "EvaluadoresModel");

            // Modelo filtros
            if (!this.getView().getModel("FiltrosModel")) {
                this.getView().setModel(new JSONModel({}), "FiltrosModel");
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
            console.log("URL base de la aplicación configurada:", appModulePath);

            return appModulePath;
        },

        InitModel: function () {
            this.getView().setModel(new JSONModel(), "FiltrosModel");
        },

        loadEvaluadores: function (filter) {
            var oModel = this.getView().getModel("Evaluadores");
            if (oModel) oModel.setProperty("/Busy", true);

            PersonalInternoService.LoadSearch(
                filter || "",
                jQuery.proxy(this.onSuccessLoadEvaluadores, this),
                jQuery.proxy(this.onErrorLoadEvaluadores, this)
            );
        },

        loadSociety: function () {
            this.LoadRegionesModel("100");
        },

        handleDelete: function (oEvent) {
            var oEvaluador = oEvent.getParameter("listItem").getBindingContext("EvaluadoresModel").getPath();
            MessageBoxHelper.showConfirm(
                "Eliminar Evaluador",
                "Desea eliminar a este evaluador?",
                jQuery.proxy(this.onPressDeleteEvaluador, this, oEvaluador)
            );
        },

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
            if (oEvaluador.Favorito === undefined) oEvaluador.Favorito = false;

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
        },

        // ============================================================
        // ✅ DIALOG con sap.ui.table.Table + selección por Legajo
        // ============================================================
        onDialogEvaluador: function () {
            var oModel = this.getView().getModel("Evaluadores");
            if (!oModel) {
                oModel = new JSONModel({
                    Evaluadores: [],
                    EvaluadoresCompletos: [],
                    SeleccionesGuardadas: [],
                    FilterValue: "",
                    Busy: true
                });
                this.getView().setModel(oModel, "Evaluadores");
            } else {
                oModel.setProperty("/Busy", true);
                if (!oModel.getProperty("/SeleccionesGuardadas")) {
                    oModel.setProperty("/SeleccionesGuardadas", []);
                }
            }

            var aAll = oModel.getProperty("/EvaluadoresCompletos") || [];
            if (aAll.length === 0) {
                this.loadEvaluadores();
            } else {
                // ✅ al abrir, mostrar todo y restaurar selecciones
                this._bSuppressSelectionSync = true;
                oModel.setProperty("/Evaluadores", aAll);
                oModel.setProperty("/FilterValue", "");
                oModel.setProperty("/Busy", false);
            }

            var that = this;

            var oUiTable = new UiTable({
                id: this.createId("UiTableEvaluador"),
                visibleRowCountMode: sap.ui.table.VisibleRowCountMode.Auto,
                minAutoRowCount: 8,
                selectionMode: sap.ui.table.SelectionMode.MultiToggle,
                selectionBehavior: sap.ui.table.SelectionBehavior.Row,
                enableBusyIndicator: true,
                busy: "{Evaluadores>/Busy}",

                // ✅ NO pisar SeleccionesGuardadas cuando la tabla resetea por filtro/refresh
                rowSelectionChange: function (oEvent) {
                    if (that._bSuppressSelectionSync) return;

                    // Si está disponible, solo guardar cuando el usuario hizo click real
                    if (oEvent && oEvent.getParameter && oEvent.getParameter("userInteraction") === false) {
                        return;
                    }

                    that._syncSelectionFromUiTable();
                },

                columns: [
                    new UiColumn({
                        width: "14rem",
                        label: new Label({ text: "Legajo" }),
                        template: new Text({ text: "{Evaluadores>Legajo}" }),
                        sortProperty: "Legajo"
                    }),
                    new UiColumn({
                        width: "22rem",
                        label: new Label({ text: "Nombre" }),
                        template: new Text({ text: "{= ${Evaluadores>Nombre} + ' ' + ${Evaluadores>Apellido}}" }),
                        sortProperty: "Nombre"
                    }),
                    new UiColumn({
                        width: "26rem",
                        label: new Label({ text: "Correo" }),
                        template: new Text({ text: "{Evaluadores>Correo}" }),
                        sortProperty: "Correo"
                    })
                ]
            });

            oUiTable.bindRows("Evaluadores>/Evaluadores");

            this._dialog = new Dialog({
                title: "Evaluadores",
                id: this.createId("oDialog"),
                stretch: true,
                busy: "{Evaluadores>/Busy}",
                busyIndicatorDelay: 0,
                afterClose: [this.afterCloseDialog, this],

                beginButton: new Button({
                    text: "Cancelar",
                    tooltip: "Cancelar",
                    press: [this.closeDialog, this]
                }),
                endButton: new Button({
                    text: "Aceptar",
                    tooltip: "Aceptar",
                    press: [this.selectedEvaluatorFromUiTable, this]
                }),

                subHeader: new Bar({
                    contentMiddle: [
                        new SearchField({
                            id: this.createId("oSearchEvaluadores"),
                            placeholder: "Buscar por Legajo, Nombre o Apellido",
                            width: "100%",
                            showSearchButton: true,
                            liveChange: [this.onSearchEvaluadoresUiTable, this],
                            search: [this.onSearchEvaluadoresUiTable, this]
                        })
                    ]
                }),

                content: [oUiTable]
            });

            this._dialog.setModel(oModel, "Evaluadores");
            this._dialog.open();

            // ✅ restaurar selección por Legajo después de render/binding
            setTimeout(function () {
                that._restoreSelectionToUiTable();
            }, 0);
        },

        closeDialog: function () {
            if (this._dialog) this._dialog.close();
        },

        afterCloseDialog: function () {
            var oModel = this.getView().getModel("Evaluadores");
            if (oModel) {
                // si querés que al reabrir NO recuerde selección, descomentá:
                // oModel.setProperty("/SeleccionesGuardadas", []);
                oModel.setProperty("/FilterValue", "");
            }

            if (this._dialog) {
                this._dialog.destroy();
                this._dialog = null;
            }
        },

        _syncSelectionFromUiTable: function () {
            var oModel = this.getView().getModel("Evaluadores");
            var oTable = this.byId("UiTableEvaluador");
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

        _restoreSelectionToUiTable: function () {
            var oModel = this.getView().getModel("Evaluadores");
            var oTable = this.byId("UiTableEvaluador");
            if (!oModel || !oTable) return;

            var aLegajos = oModel.getProperty("/SeleccionesGuardadas") || [];

            // ✅ suprimir sync mientras tocamos selección programáticamente
            this._bSuppressSelectionSync = true;

            oTable.clearSelection();

            if (aLegajos.length) {
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
            }

            var that = this;
            setTimeout(function () {
                that._bSuppressSelectionSync = false;
            }, 0);
        },

        onSearchEvaluadoresUiTable: function (oEvent) {
            var oModel = this.getView().getModel("Evaluadores");
            if (!oModel) return;

            var sSearchValue = "";
            if (oEvent.getParameter) {
                sSearchValue = oEvent.getParameter("newValue");
                if (sSearchValue === undefined) sSearchValue = oEvent.getParameter("query");
            }
            sSearchValue = (sSearchValue || "").toString().trim();

            var aAll = oModel.getProperty("/EvaluadoresCompletos") || [];

            // ✅ clave: mientras cambiamos dataset por filtro/clear, NO sync selección (evita guardar [])
            this._bSuppressSelectionSync = true;

            if (!sSearchValue) {
                oModel.setProperty("/Evaluadores", aAll);
                oModel.setProperty("/FilterValue", "");
            } else {
                var q = sSearchValue.toLowerCase();
                var aFiltered = aAll.filter(function (e) {
                    var n = (e.Nombre || "").toLowerCase();
                    var a = (e.Apellido || "").toLowerCase();
                    var l = (e.Legajo || "").toLowerCase();
                    return n.indexOf(q) !== -1 || a.indexOf(q) !== -1 || l.indexOf(q) !== -1;
                });
                oModel.setProperty("/Evaluadores", aFiltered);
                oModel.setProperty("/FilterValue", sSearchValue);
            }

            var that = this;
            setTimeout(function () {
                // _restoreSelectionToUiTable vuelve a habilitar sync al final
                that._restoreSelectionToUiTable();
            }, 0);
        },

        selectedEvaluatorFromUiTable: function () {
            var oTable = this.byId("UiTableEvaluador");
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

            oEvalModel.setProperty("/EvaluadoresModel", this._ordenarEvaluadoresPorFavoritos(aActuales));
            oEvalModel.updateBindings(true);

            this.closeDialog();

            var oFiltrosModel = this.getView().getModel("FiltrosModel");
            if (oFiltrosModel) {
                oFiltrosModel.setProperty("/Puser", "");
                oFiltrosModel.setProperty("/Nombre", "");
                oFiltrosModel.updateBindings(true);
            }
        },

        // ============================================================
        // Resto (servicios / modelos)
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

        validateEvaluador: function () {
            var oModel = this.getView().getModel("EvaluadoresModel");
            if (!oModel) return true;

            var aEvaluadores = oModel.getProperty("/EvaluadoresModel") || [];
            var evaluador = this.getView().getModel("FiltrosModel").getData();
            if (!evaluador || !evaluador.Puser) return true;

            for (var i = 0; i < aEvaluadores.length; i++) {
                if (aEvaluadores[i].Puser === evaluador.Puser) return false;
            }
            return true;
        },

        onClearFilters: function () {
            this.getView().getModel("FiltrosModel").setData({});
        },

        LoadRegionesModel: function (empresa) {
            RegionService.LoadRegiones(
                empresa,
                jQuery.proxy(this.onSuccessRegion, this),
                jQuery.proxy(this.onErrorRegion, this)
            );
        },

        onSuccessRegion: function (data) {
            var oModel = new JSONModel({ Regiones: data.results || [] });
            this.getView().setModel(oModel, "Regiones");
        },

        onErrorRegion: function () { },

        onSuccessLoadEvaluadores: function (response) {
            var aEvaluadores = (response && response.results) ? response.results : [];

            var oModel = this.getView().getModel("Evaluadores");
            if (!oModel) {
                oModel = new JSONModel({
                    Evaluadores: [],
                    EvaluadoresCompletos: [],
                    SeleccionesGuardadas: [],
                    FilterValue: "",
                    Busy: false
                });
                this.getView().setModel(oModel, "Evaluadores");
            }

            oModel.setProperty("/EvaluadoresCompletos", aEvaluadores);
            oModel.setProperty("/Evaluadores", aEvaluadores);
            oModel.setProperty("/FilterValue", "");
            if (!oModel.getProperty("/SeleccionesGuardadas")) oModel.setProperty("/SeleccionesGuardadas", []);
            oModel.setProperty("/Busy", false);

            // si el dialog está abierto, restaurar selección
            var that = this;
            setTimeout(function () {
                that._restoreSelectionToUiTable();
            }, 0);
        },

        onErrorLoadEvaluadores: function (error) {
            console.error("Error al cargar evaluadores:", error);
            MessageBoxHelper.showAlert("Error", "No se pudieron cargar los evaluadores. Por favor, intente nuevamente.");

            var oModel = this.getView().getModel("Evaluadores");
            if (oModel) oModel.setProperty("/Busy", false);
        }

    });
});
