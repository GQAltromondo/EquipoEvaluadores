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
                var oModel = new JSONModel({ 
                    Evaluadores: [], 
                    EvaluadoresCompletos: [],
                    SeleccionesGuardadas: [],
                    FilterValue: "",
                    Busy: false 
                });
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
            _ordenarEvaluadoresPorFavoritos: function(aEvaluadores) {
                if (!aEvaluadores || aEvaluadores.length === 0) {
                    return aEvaluadores;
                }
                
                // Crear una copia del array para no modificar el original directamente
                var aOrdenados = aEvaluadores.slice();
                
                // Ordenar: favoritos primero, luego los demás
                aOrdenados.sort(function(a, b) {
                    var aFavorito = a.Favorito === true ? 1 : 0;
                    var bFavorito = b.Favorito === true ? 1 : 0;
                    
                    // Si ambos son favoritos o ninguno, mantener el orden original
                    if (aFavorito === bFavorito) {
                        return 0;
                    }
                    
                    // Los favoritos van primero (retornar negativo si a es favorito)
                    return bFavorito - aFavorito;
                });
                
                return aOrdenados;
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
                
                // Actualizar el estado del favorito
                oEvaluador.Favorito = bNuevoEstado;
                
                // Ordenar los evaluadores poniendo favoritos primero
                var aEvaluadoresOrdenados = this._ordenarEvaluadoresPorFavoritos(aEvaluadores);
                
                // Actualizar el modelo con los evaluadores ordenados
                oModel.setProperty("/EvaluadoresModel", aEvaluadoresOrdenados);
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
                    
                    // Ordenar los evaluadores poniendo favoritos primero
                    var aEvaluadoresOrdenados = this._ordenarEvaluadoresPorFavoritos(aEvaluadores);
                    
                    oModel.setProperty("/EvaluadoresModel", aEvaluadoresOrdenados);
                    oModel.updateBindings(true);
                }
            },
            onDialogEvaluador: function () {
                var that = this;
                
                // Obtener o crear el modelo Evaluadores
                var oModel = this.getView().getModel("Evaluadores");
                if (!oModel) {
                    oModel = new JSONModel({ 
                        Evaluadores: [], 
                        EvaluadoresCompletos: [], // Copia completa para filtrado
                        SeleccionesGuardadas: [], // Selecciones acumuladas durante la sesión
                        FilterValue: "",
                        Busy: true 
                    });
                    this.getView().setModel(oModel, "Evaluadores");
                } else {
                    oModel.setProperty("/Busy", true);
                    // Inicializar selecciones guardadas si no existe
                    if (!oModel.getProperty("/SeleccionesGuardadas")) {
                        oModel.setProperty("/SeleccionesGuardadas", []);
                    }
                }
                
                // Cargar los datos del PersonalInternoService cuando se abre el Dialog (solo una vez)
                // Si ya hay datos completos cargados, no volver a cargar
                var aEvaluadoresCompletos = oModel.getProperty("/EvaluadoresCompletos") || [];
                if (aEvaluadoresCompletos.length === 0) {
                    this.loadEvaluadores();
                } else {
                    // Si ya hay datos, restaurar la lista completa y quitar el filtro
                    oModel.setProperty("/Evaluadores", aEvaluadoresCompletos);
                    oModel.setProperty("/FilterValue", "");
                    oModel.setProperty("/Busy", false);
                }
                
                this._dialog = new sap.m.Dialog({
                    title: "Evaluadores",
                    id: "oDialog",
                    busy: "{Evaluadores>/Busy}",
                    busyIndicatorDelay: 0,
                    showHeader: true,
                    stretch: true,
                    afterClose: [this.afterCloseDialog, this],
                    beginButton: new sap.m.Button({
                        text: "Cancelar",
                        tooltip: "Cancelar",
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
                                id: this.createId("oSearchEvaluadores"),
                                placeholder: "Buscar por Legajo, Nombre o Apellido",
                                search: [this.onSearchEvaluadores, this],
                                liveChange: [this.onSearchEvaluadores, this],
                                width: "100%",
                                showSearchButton: true
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

                if (!oTableId || oTableId.getSelectedItems().length === 0) {
                    MessageBoxHelper.showAlert("Equipo Evaluador", "Debe seleccionar al menos un evaluador.");
                    return;
                }

                // Obtener el modelo de la tabla principal
                var oEvaluadoresModel = this.getView().getModel("EvaluadoresModel");
                var aEvaluadoresActuales = oEvaluadoresModel.getProperty("/EvaluadoresModel") || [];
                
                oTableId.getSelectedItems().forEach(function(obj) {
                    var oContext = obj.getBindingContext("Evaluadores");
                    if (!oContext) {
                        // Si no hay binding context, intentar obtener el objeto directamente del item
                        var oListItem = obj;
                        var oData = oListItem.data ? oListItem.data() : null;
                        if (!oData) {
                            return; // Saltar este item si no se puede obtener el objeto
                        }
                        var oObject = oData;
                    } else {
                        var oObject = oContext.getObject();
                    }
                    
                    if (!oObject || !oObject.Legajo) {
                        return; // Saltar si no hay objeto válido o Legajo
                    }
                    
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

                // Ordenar los evaluadores poniendo favoritos primero
                var aEvaluadoresOrdenados = this._ordenarEvaluadoresPorFavoritos(aEvaluadoresActuales);
                
                // Actualizar el modelo de la tabla principal
                oEvaluadoresModel.setProperty("/EvaluadoresModel", aEvaluadoresOrdenados);
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
                // Limpiar las selecciones guardadas al cerrar el dialog
                var oModel = this.getView().getModel("Evaluadores");
                if (oModel) {
                    oModel.setProperty("/SeleccionesGuardadas", []);
                    oModel.setProperty("/FilterValue", "");
                }
                
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
                var sSearchValue = "";
                var oSearchField = oEvent.getSource();
                var oTable = this.byId("TableEvaluador");
                var oModel = this.getView().getModel("Evaluadores");
                
                if (!oModel) {
                    return;
                }
                
                // Guardar las selecciones actuales ANTES de filtrar (usando Legajo como identificador único)
                var aSeleccionesGuardadas = oModel.getProperty("/SeleccionesGuardadas") || [];
                var aSeleccionesActuales = [];
                
                if (oTable) {
                    var aSelectedItems = oTable.getSelectedItems();
                    aSelectedItems.forEach(function(oItem) {
                        var oContext = oItem.getBindingContext("Evaluadores");
                        if (oContext) {
                            var oObject = oContext.getObject();
                            if (oObject && oObject.Legajo) {
                                var sLegajo = oObject.Legajo;
                                if (aSeleccionesActuales.indexOf(sLegajo) === -1) {
                                    aSeleccionesActuales.push(sLegajo);
                                }
                            }
                        }
                    });
                    
                    // Combinar con las selecciones guardadas anteriormente
                    aSeleccionesActuales.forEach(function(sLegajo) {
                        if (aSeleccionesGuardadas.indexOf(sLegajo) === -1) {
                            aSeleccionesGuardadas.push(sLegajo);
                        }
                    });
                }
                
                // Obtener el valor del search field
                if (oEvent.getParameter) {
                    // Para liveChange, usar newValue (incluye cuando se limpia con la cruz)
                    sSearchValue = oEvent.getParameter("newValue");
                    // Para search, usar query
                    if (sSearchValue === undefined) {
                        sSearchValue = oEvent.getParameter("query");
                    }
                }
                
                // Si no hay parámetro, obtener directamente del campo
                if (sSearchValue === undefined || sSearchValue === null) {
                    if (oSearchField && oSearchField.getValue) {
                        sSearchValue = oSearchField.getValue() || "";
                    }
                }
                
                // Asegurar que sea string
                sSearchValue = (sSearchValue || "").toString().trim();
                
                // Guardar todas las selecciones acumuladas
                oModel.setProperty("/SeleccionesGuardadas", aSeleccionesGuardadas);
                
                // Limpiar TODAS las selecciones ANTES de actualizar el binding
                // Esto evita que se mantengan selecciones por índice
                if (oTable) {
                    try {
                        // Intentar limpiar todas las selecciones
                        var aCurrentItems = oTable.getItems();
                        aCurrentItems.forEach(function(oItem) {
                            if (oItem.getSelected && oItem.getSelected()) {
                                oTable.setSelectedItem(oItem, false);
                            }
                        });
                    } catch (e) {
                        console.warn("Error al limpiar selecciones:", e);
                    }
                }
                
                // Filtrar localmente sobre los datos ya cargados
                var aEvaluadoresCompletos = oModel.getProperty("/EvaluadoresCompletos") || [];
                
                if (!sSearchValue || sSearchValue === "") {
                    // Si el filtro está vacío (incluye cuando se hace clic en la cruz), mostrar todos
                    oModel.setProperty("/Evaluadores", aEvaluadoresCompletos);
                    oModel.setProperty("/FilterValue", "");
                } else {
                    // Filtrar localmente
                    var sFilterLower = sSearchValue.toLowerCase();
                    var aFiltrados = aEvaluadoresCompletos.filter(function(evaluador) {
                        var sNombre = (evaluador.Nombre || "").toLowerCase();
                        var sApellido = (evaluador.Apellido || "").toLowerCase();
                        var sLegajo = (evaluador.Legajo || "").toLowerCase();
                        return sNombre.indexOf(sFilterLower) !== -1 || 
                               sApellido.indexOf(sFilterLower) !== -1 || 
                               sLegajo.indexOf(sFilterLower) !== -1;
                    });
                    oModel.setProperty("/Evaluadores", aFiltrados);
                    oModel.setProperty("/FilterValue", sSearchValue);
                }
                
                // Guardar las selecciones antes de actualizar el binding
                var aSeleccionesParaRestaurar = aSeleccionesGuardadas.slice();
                
                oModel.updateBindings(true);
                
                // Restaurar las selecciones después de que el binding se actualice
                var that = this;
                var fnRestoreSelections = function() {
                    if (!oTable) {
                        return;
                    }
                    
                    var aItems = oTable.getItems();
                    var aSelecciones = aSeleccionesParaRestaurar;
                    
                    if (aItems.length === 0 || aSelecciones.length === 0) {
                        return;
                    }
                    
                    // Asegurarse de que todos los items tengan binding context válido
                    var aItemsValidos = [];
                    aItems.forEach(function(oItem) {
                        var oContext = oItem.getBindingContext("Evaluadores");
                        if (oContext) {
                            try {
                                var oObject = oContext.getObject();
                                if (oObject && oObject.Legajo) {
                                    aItemsValidos.push({
                                        item: oItem,
                                        legajo: oObject.Legajo
                                    });
                                }
                            } catch (e) {
                                // Ignorar items sin binding válido
                            }
                        }
                    });
                    
                    // Primero, asegurarse de que NO hay selecciones por defecto
                    aItemsValidos.forEach(function(oItemData) {
                        if (oItemData.item.getSelected && oItemData.item.getSelected()) {
                            oTable.setSelectedItem(oItemData.item, false);
                        }
                    });
                    
                    // Luego, seleccionar SOLO los items que corresponden a los Legajos guardados
                    aItemsValidos.forEach(function(oItemData) {
                        if (aSelecciones.indexOf(oItemData.legajo) !== -1) {
                            oTable.setSelectedItem(oItemData.item, true);
                        }
                    });
                };
                
                // Usar el evento updateFinished del binding
                var oBinding = oTable ? oTable.getBinding("items") : null;
                if (oBinding) {
                    // Detener cualquier listener previo del mismo tipo
                    oBinding.detachEvent("updateFinished", fnRestoreSelections);
                    oBinding.attachEventOnce("updateFinished", fnRestoreSelections);
                } else {
                    // Fallback: usar setTimeout con múltiples intentos
                    var iAttempts = 0;
                    var fnTryRestore = function() {
                        iAttempts++;
                        var aItems = oTable ? oTable.getItems() : [];
                        if (aItems.length > 0) {
                            fnRestoreSelections();
                        } else if (iAttempts < 10) {
                            setTimeout(fnTryRestore, 50);
                        }
                    };
                    setTimeout(fnTryRestore, 100);
                }
            },
            onSuccessLoadEvaluadores: function (response) {
                var aEvaluadores = response.results || [];
                
                // Crear o actualizar el modelo Evaluadores
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
                
                // Guardar la copia completa de todos los evaluadores
                oModel.setProperty("/EvaluadoresCompletos", aEvaluadores);
                oModel.setProperty("/Evaluadores", aEvaluadores);
                oModel.setProperty("/FilterValue", "");
                // Inicializar selecciones guardadas si no existe
                if (!oModel.getProperty("/SeleccionesGuardadas")) {
                    oModel.setProperty("/SeleccionesGuardadas", []);
                }
                oModel.setProperty("/Busy", false);
                
                // Si el Dialog está abierto, actualizar su modelo también
                if (this._dialog) {
                    this._dialog.setModel(oModel, "Evaluadores");
                    // Actualizar también el binding de la tabla
                    var oTable = this.byId("TableEvaluador");
                    if (oTable) {
                        var oBinding = oTable.getBinding("items");
                        if (oBinding) {
                            oBinding.refresh();
                        }
                    }
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
