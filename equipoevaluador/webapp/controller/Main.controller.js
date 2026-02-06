sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "transener/equipoevaluador/utils/MessageBoxHelper",
    "transener/equipoevaluador/utils/ModelHelper",
    "transener/equipoevaluador/services/RegionService",
    "transener/equipoevaluador/services/EvaluadoresService",
    "transener/equipoevaluador/services/PersonalInternoService"
],
    function (Controller, JSONModel, MessageBoxHelper, ModelHelper, RegionService, EvaluadoresService, PersonalInternoService) {
        "use strict";

        return Controller.extend("transener.equipoevaluador.controller.Main", {
            onInit: function () {
                // this.InitModel();
                // this.LoadFuncionesModel();
                this.getBaseURL();
                
                // Inicializar el modelo Evaluadores
                var oModel = new JSONModel({ Evaluadores: [], Busy: false });
                this.getView().setModel(oModel, "Evaluadores");
                
                // Inicializar el modelo FiltrosModel si no existe
                if (!this.getView().getModel("FiltrosModel")) {
                    var oFiltrosModel = new JSONModel({});
                    this.getView().setModel(oFiltrosModel, "FiltrosModel");
                }
            },
            getBaseURL: function () {
                var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");

                // Guardar el appId en un modelo por si se necesita
                var appModel = ModelHelper.getModel("appModel", this.getView())
                appModel.setData(appId);
                sap.ui.getCore().setModel(appModel, "appId");

                // Construir el path del módulo
                var appPath = appId.replaceAll(".", "/");
                var appModulePath = jQuery.sap.getModulePath(appPath);

                // Crear o actualizar el modelo appCurrentInfo
                var jsonModel = sap.ui.getCore().getModel("appCurrentInfo");
                if (!jsonModel) {
                    jsonModel = new JSONModel();
                    jsonModel.setSizeLimit(9999);
                    sap.ui.getCore().setModel(jsonModel, "appCurrentInfo");
                }

                // Setear la URL en el modelo
                jsonModel.setData({
                    appUrl: appModulePath
                });

                console.log("URL base de la aplicación configurada:", appModulePath);

                return appModulePath;
            },
            InitModel: function () {
                var oModel = new sap.ui.model.json.JSONModel();
                this.getView().setModel(oModel, "FiltrosModel");
            },
            loadEvaluadores: function (filter) {
                var oModel = this.getView().getModel("Evaluadores");
                if (oModel) {
                    oModel.setProperty("/Busy", true);
                }
                
                PersonalInternoService.LoadSearch(
                    filter || "",
                    jQuery.proxy(this.onSuccessLoadEvaluadores, this),
                    jQuery.proxy(this.onErrorLoadEvaluadores, this)
                );
            },
            loadSociety: function () {
                var that = this;

                var empresa = "100";
                // if (this.getView().getModel().getData().society === "TRANSENER") {
                //     empresa = "100";
                // } else {
                //     empresa = "300";
                // }
                that.LoadRegionesModel(empresa);
                /*			oModeld.read("/EmpresaUsuarioSet", {
                                success: function (data) {
                                    var empresa = data.results[0].Empresa;
                                    that.LoadRegionesModel(empresa);
                                },
                                error: function (err) {
                                    //do something;
                                }
                            });*/

            },
            handleDelete: function (oEvent) {
                var oEvaluador = oEvent.getParameter("listItem").getBindingContext("EvaluadoresModel").getPath();
                MessageBoxHelper.showConfirm("Eliminar Evaluador", "Desea eliminar a este evaluador?",
                    jQuery.proxy(this.onPressDeleteEvaluador, this, oEvaluador)
                );
            },
            onPressDeleteEvaluador: function (oEvaluador) {
                var oModel = this.getView().getModel("EvaluadoresModel").getData().EvaluadoresModel;
                var index = oEvaluador.replace("/EvaluadoresModel/", "");
                oModel.splice(index, 1);
                this.getView().getModel("EvaluadoresModel").updateBindings(true);
            },
            onDialogEvaluador: function () {
                var that = this;
                
                // Obtener o crear el modelo Evaluadores
                var oModel = this.getView().getModel("Evaluadores");
                if (!oModel) {
                    oModel = new JSONModel({ Evaluadores: [], Busy: true });
                    this.getView().setModel(oModel, "Evaluadores");
                } else {
                    oModel.setProperty("/Busy", true);
                }
                
                // Cargar los datos del PersonalInternoService cuando se abre el Dialog
                this.loadEvaluadores();
                
                this._dialog = new sap.m.Dialog({
                    title: "Evaluadores",
                    id: "oDialog",
                    busy: "{Evaluadores>/Busy}",
                    busyIndicatorDelay: 0,
                    showHeader: true,
                    stretch: true,
                    afterClose: [this.afterCloseDialog, this],
                    beginButton: new sap.m.Button({
                        icon: "sap-icon://sys-cancel",
                        tooltip: "{i18n>Close}",
                        press: [this.closeDialog, this]
                    }),
                    endButton: new sap.m.Button({
                        text: "Aceptar",
                        tooltip: "Aceptar",
                        press: [this.selectedEvaluator, this]
                    }),
                    subHeader: new sap.m.Bar({
                        contentMiddle: [
                            new sap.m.SearchField({
                                id: "oSearchEvaluadores",
                                placeholder: "{i18n>Search}",
                                search: [this.onSearchEvaluadores, this],
                                liveChange: [this.onSearchEvaluadores, this],
                                width: "100%"
                            })
                        ]
                    }),
                    content: [
                        new sap.m.Table({
                            id: this.createId("TableEvaluador"),
                            fixedLayout: false,
                            noDataText: "No hay evaluadores disponibles",
                            busy: "{Evaluadores>/Busy}",
                            busyIndicatorDelay: 0,
                            mode: "MultiSelect",
                            columns: [
                                new sap.m.Column({
                                    header: new sap.m.Title({
                                        text: "Nombre",
                                        design: "bold"
                                    }),
                                    width: "40%"
                                }),
                                new sap.m.Column({
                                    header: new sap.m.Title({
                                        text: "Correo",
                                        design: "bold"
                                    }),
                                    width: "40%"
                                }),
                                new sap.m.Column({
                                    header: new sap.m.Title({
                                        text: "Legajo",
                                        design: "bold"
                                    }),
                                    width: "20%"
                                })
                            ]
                        }).bindItems({
                            path: "Evaluadores>/Evaluadores",
                            template: new sap.m.ColumnListItem({
                                type: sap.m.ListType.None,
                                press: [this.onEvaluadorPress, this],
                                cells: [
                                    new sap.m.Text({
                                        text: "{= ${Evaluadores>Nombre} + ' ' + ${Evaluadores>Apellido}}"
                                    }),
                                    new sap.m.Text({
                                        text: "{Evaluadores>Correo}"
                                    }),
                                    new sap.m.Text({
                                        text: "{Evaluadores>Legajo}"
                                    }),
                                ]
                            })
                        })
                    ]
                });
                
                this._dialog.setModel(oModel, "Evaluadores");
                this._dialog.open();
            },

            selectedEvaluator: function (oEvent) {
                let oTableId = this.byId("TableEvaluador");
                let aEvaluadores = [],
                    sNombres = [],
                    sPuser = [];

                if (oTableId.getSelectedItems().length <= 3) {
                    oTableId.getSelectedItems().forEach(obj => {
                        let oObject = obj.getBindingContext("Evaluadores").getObject();

                        let oDisplay = {
                            Correo: oObject.Correo,
                            Nombre: (oObject.Nombre || "") + " " + (oObject.Apellido || ""),
                            Puser: oObject.Legajo
                        }
                        aEvaluadores.push(oDisplay);
                        sNombres.push((oObject.Nombre || "") + " " + (oObject.Apellido || ""));
                        sPuser.push(oObject.Legajo);
                    });

                    var oData = this.getView().getModel("FiltrosModel").getData();
                    if (!oData) {
                        oData = {};
                    }
                    oData.Nombre = sNombres.join(' / ');
                    oData.Puser = sPuser.join(', ');
                    oData.Evaluadores = aEvaluadores;
                    this.getView().getModel("FiltrosModel").setData(oData);
                    this.getView().getModel("FiltrosModel").updateBindings(true);
                    this._dialog.close();

                } else {
                    MessageBoxHelper.showAlert("Equipo Evaluador", "Solo puede agregar 3 evaluadores.");
                }
            },

            onEvaluadorPress: function (oEvent) {
                var Evaluadores = oEvent.getSource().getBindingContext("Evaluadores").getObject();
                var oData = this.getView().getModel("FiltrosModel").getData();
                oData.Nombre = Evaluadores.display;
                oData.Puser = Evaluadores.value;
                oData.Correo = Evaluadores.Email;
                this.getView().getModel("FiltrosModel").updateBindings(true);
                this._dialog.close();
            },
            closeDialog: function () {
                this._dialog.close();
            },
            afterCloseDialog: function () {
                this._dialog.destroy();
                this._dialog = null;
            },
            onSaveEvaluador: function () {
                var evaluador = this.getView().getModel("FiltrosModel").getProperty("/Evaluadores");
                if (Object.keys(evaluador).length == 0)
                    return MessageBoxHelper.showAlert("Equipo Evaluador", "Debe seleccionar un evaluador.");
                this.getView().getModel("EvaluadoresModel").setProperty("/EvaluadoresModel", evaluador);
                this.getView().getModel("EvaluadoresModel").updateBindings(true);
                this.getView().getModel("FiltrosModel").setData({});
            },
            validateEvaluador: function () {
                var EvaluadoresModel = this.getView().getModel("EvaluadoresModel").getData().EvaluadoresModel;
                var evaluador = this.getView().getModel("FiltrosModel").getData();
                for (var row in EvaluadoresModel) {
                    if (EvaluadoresModel[row].Puser == evaluador.Puser)
                        return false;
                }
                return true;
            },
            onClearFilters: function () {
                this.getView().getModel("FiltrosModel").setData({});
            },
            formatSwitch: function (checkInt) {
                if (checkInt) {
                    this.getView().byId("labelLegajo").setVisible(true);
                    this.getView().byId("inputLegajo").setVisible(true);
                }
                return checkInt;
            },
            LoadFuncionesModel: function () {
                var Funciones = [{
                    "Codigo": "PE1",
                    "Funcion": "Jefe de Turno del COT"
                }, {
                    "Codigo": "PE2",
                    "Funcion": "Operador de Turno del COT."
                }, {
                    "Codigo": "PE3",
                    "Funcion": "Operador de Apoyo del COT."
                }, {
                    "Codigo": "PE4",
                    "Funcion": "Operador del Centro Regional."
                }, {
                    "Codigo": "PE5",
                    "Funcion": "Técnico de Estaciones Transformadoras."
                }, {
                    "Codigo": "PB1",
                    "Funcion": "Jefe de Turno del COTDT"
                }, {
                    "Codigo": "PB2",
                    "Funcion": "Operador del COTDT"
                }, {
                    "Codigo": "PB3",
                    "Funcion": "Operador de los Centros Operativos Regionales"
                }, {
                    "Codigo": "PB4",
                    "Funcion": "Técnico de Estaciones Transformadoras"
                }];
                var oModel = new sap.ui.model.json.JSONModel();
                oModel.setData({
                    Funciones: Funciones
                });
                this.getView().setModel(oModel, "Funciones");
            },
            LoadRegionesModel: function (empresa) {
                RegionService.LoadRegiones(
                    empresa,
                    jQuery.proxy(this.onSuccessRegion, this),
                    jQuery.proxy(this.onErrorRegion, this)
                );
            },
            onSuccessRegion: function (data) {
                var Regiones = data.results;
                var oModel = new sap.ui.model.json.JSONModel();
                oModel.setData({
                    Regiones: Regiones
                });
                this.getView().setModel(oModel, "Regiones");
            },
            onErrorRegion: function (error) {

            },
            getEmpresa: function () {
                var taskId = this.getView().getModel("FiltrosModel").id;
                var contextModel = new sap.ui.model.json.JSONModel();
                contextModel.attachRequestCompleted(this, this.successCallbackReg);
                contextModel.loadData("/bpmworkflowruntime/rest/v1/task-instances/" + taskId + "/context", "", true);
            },

            successCallbackReg: function (data, Component) {
                var UserData = data.oSource.oData;
                var oModel = new sap.ui.model.json.JSONModel();
                oModel.setData(UserData);
                Component.setModel(oModel, "datosWF");
            },

            LoadIntervenciones: function (Idhabilitacion) {
                this.loadSociety();
            },

            onSearchEvaluadores: function (oEvent) {
                var sSearchValue = oEvent.getParameter("newValue") || oEvent.getSource().getValue() || "";
                this.loadEvaluadores(sSearchValue);
            },
            onSuccessLoadEvaluadores: function (response) {
                var aEvaluadores = response.results || [];
                
                // Crear o actualizar el modelo Evaluadores
                var oModel = this.getView().getModel("Evaluadores");
                if (!oModel) {
                    oModel = new JSONModel({ Evaluadores: [], Busy: false });
                    this.getView().setModel(oModel, "Evaluadores");
                }
                
                oModel.setProperty("/Evaluadores", aEvaluadores);
                oModel.setProperty("/Busy", false);
                
                // Si el Dialog está abierto, actualizar su modelo también
                if (this._dialog) {
                    this._dialog.setModel(oModel, "Evaluadores");
                }
            },

            onErrorLoadEvaluadores: function (error) {
                console.error("Error al cargar evaluadores:", error);
                MessageBoxHelper.showAlert("Error", "No se pudieron cargar los evaluadores. Por favor, intente nuevamente.");
                
                var oModel = this.getView().getModel("Evaluadores");
                if (oModel) {
                    oModel.setProperty("/Busy", false);
                }
            }
        });
    });
