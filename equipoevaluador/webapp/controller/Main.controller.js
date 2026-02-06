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
                
                // Inicializar el modelo EvaluadoresModel para la tabla principal
                var oEvaluadoresModel = new JSONModel({ EvaluadoresModel: [] });
                this.getView().setModel(oEvaluadoresModel, "EvaluadoresModel");
                
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
            onToggleFavorito: function (oEvent) {
                var oButton = oEvent.getSource();
                var oListItem = oButton.getParent();
                var oContext = oListItem.getBindingContext("EvaluadoresModel");
                
                if (!oContext) {
                    return;
                }
                
                var sPath = oContext.getPath();
                var oEvaluador = oContext.getObject();
                
                // Asegurar que el campo Favorito existe
                if (oEvaluador.Favorito === undefined) {
                    oEvaluador.Favorito = false;
                }
                
                var oModel = this.getView().getModel("EvaluadoresModel");
                var aEvaluadores = oModel.getProperty("/EvaluadoresModel") || [];
                
                // Contar favoritos actuales (excluyendo el actual si ya es favorito)
                var iFavoritosCount = aEvaluadores.filter(function(evalu) {
                    return evalu.Favorito === true;
                }).length;
                
                // Si está intentando marcar como favorito y ya hay 3 favoritos
                if (!oEvaluador.Favorito && iFavoritosCount >= 3) {
                    MessageBoxHelper.showAlert("Favoritos", "Solo puede tener hasta 3 evaluadores favoritos. Desmarque uno antes de agregar otro.");
                    return;
                }
                
                // Toggle del estado de favorito
                var bNuevoEstado = !oEvaluador.Favorito;
                
                // Actualizar el modelo
                oModel.setProperty(sPath + "/Favorito", bNuevoEstado);
                oModel.updateBindings(true);
            },
            onPressDeleteEvaluador: function (oEvaluador) {
                var oModel = this.getView().getModel("EvaluadoresModel");
                var aEvaluadores = oModel.getProperty("/EvaluadoresModel") || [];
                var index = parseInt(oEvaluador.replace("/EvaluadoresModel/", ""));
                
                if (index >= 0 && index < aEvaluadores.length) {
                    aEvaluadores.splice(index, 1);
                    // Asegurar que todos los evaluadores tengan el campo Favorito
                    aEvaluadores.forEach(function(evalu) {
                        if (evalu.Favorito === undefined) {
                            evalu.Favorito = false;
                        }
                    });
                    oModel.setProperty("/EvaluadoresModel", aEvaluadores);
                    oModel.updateBindings(true);
                }
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
                                        text: "Legajo",
                                        design: "bold"
                                    }),
                                    width: "20%"
                                }),
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
                                })
                            ]
                        }).bindItems({
                            path: "Evaluadores>/Evaluadores",
                            template: new sap.m.ColumnListItem({
                                type: sap.m.ListType.None,
                                press: [this.onEvaluadorPress, this],
                                cells: [
                                    new sap.m.Text({
                                        text: "{Evaluadores>Legajo}"
                                    }),
                                    new sap.m.Text({
                                        text: "{= ${Evaluadores>Nombre} + ' ' + ${Evaluadores>Apellido}}"
                                    }),
                                    new sap.m.Text({
                                        text: "{Evaluadores>Correo}"
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

                if (oTableId.getSelectedItems().length === 0) {
                    MessageBoxHelper.showAlert("Equipo Evaluador", "Debe seleccionar al menos un evaluador.");
                    return;
                }

                // Obtener el modelo de la tabla principal
                var oEvaluadoresModel = this.getView().getModel("EvaluadoresModel");
                var aEvaluadoresActuales = oEvaluadoresModel.getProperty("/EvaluadoresModel") || [];
                
                oTableId.getSelectedItems().forEach(obj => {
                    let oObject = obj.getBindingContext("Evaluadores").getObject();
                    let sLegajo = oObject.Legajo;
                    let sNombreCompleto = (oObject.Nombre || "").trim() + " " + (oObject.Apellido || "").trim();

                    // Verificar si el evaluador ya existe en la tabla principal
                    var bExiste = aEvaluadoresActuales.some(function(evalu) {
                        return evalu.Puser === sLegajo;
                    });

                    if (!bExiste) {
                        let oDisplay = {
                            Correo: oObject.Correo || "",
                            Nombre: sNombreCompleto.trim(),
                            Puser: sLegajo,
                            Favorito: false
                        };
                        aEvaluadores.push(oDisplay);
                        aEvaluadoresActuales.push(oDisplay);
                        sNombres.push(sNombreCompleto.trim());
                        sPuser.push(sLegajo);
                    }
                });

                // Actualizar el modelo de la tabla principal
                oEvaluadoresModel.setProperty("/EvaluadoresModel", aEvaluadoresActuales);
                oEvaluadoresModel.updateBindings(true);

                this._dialog.close();

                // Limpiar los campos del formulario después de agregar los evaluadores
                var oFiltrosModel = this.getView().getModel("FiltrosModel");
                if (oFiltrosModel) {
                    oFiltrosModel.setProperty("/Puser", "");
                    oFiltrosModel.setProperty("/Nombre", "");
                    oFiltrosModel.updateBindings(true);
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
                var oEvaluadoresModel = this.getView().getModel("EvaluadoresModel");
                var aEvaluadores = oEvaluadoresModel.getProperty("/EvaluadoresModel") || [];
                
                if (aEvaluadores.length === 0) {
                    MessageBoxHelper.showAlert("Equipo Evaluador", "No hay evaluadores seleccionados. Por favor, seleccione al menos un evaluador desde el diálogo.");
                    return;
                }
                
                // Contar favoritos
                var aFavoritos = aEvaluadores.filter(function(evalu) {
                    return evalu.Favorito === true;
                });
                
                var sMensaje = "Se guardaron " + aEvaluadores.length + " evaluador(es)";
                if (aFavoritos.length > 0) {
                    sMensaje += " (" + aFavoritos.length + " favorito(s))";
                }
                sMensaje += ".";
                
                MessageBoxHelper.showAlert("Equipo Evaluador", sMensaje);
            },
            validateEvaluador: function () {
                var oModel = this.getView().getModel("EvaluadoresModel");
                if (!oModel) {
                    return true;
                }
                var aEvaluadores = oModel.getProperty("/EvaluadoresModel") || [];
                var evaluador = this.getView().getModel("FiltrosModel").getData();
                
                if (!evaluador || !evaluador.Puser) {
                    return true;
                }
                
                for (var i = 0; i < aEvaluadores.length; i++) {
                    if (aEvaluadores[i].Puser === evaluador.Puser) {
                        return false;
                    }
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
                var sSearchValue = oEvent.getParameter("newValue") || oEvent.getParameter("query") || oEvent.getSource().getValue() || "";
                // Trim para eliminar espacios en blanco
                sSearchValue = sSearchValue.trim();
                // Cargar evaluadores con el filtro de búsqueda
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
