/**
 * EJEMPLO DE USO DE SocietyHelper
 * 
 * Este archivo muestra cómo usar SocietyHelper en un controlador.
 * NO es parte del código de producción, solo es documentación.
 */

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "transener/equipoevaluador/utils/SocietyHelper",
    "transener/equipoevaluador/services/oDataService"
], function (Controller, SocietyHelper, oDataService) {
    "use strict";

    return Controller.extend("ejemplo.controller.Main", {

        onInit: function () {
            // Ejemplo 1: Cargar empresa desde backend
            this.loadSociety();
        },

        /**
         * Ejemplo 1: Cargar empresa desde backend con callbacks
         */
        loadSociety: async function () {
            var that = this;
            var oModelOperaciones = this.getOwnerComponent().getModel("operaciones");

            await SocietyHelper.loadSociety(
                this, // oController
                oModelOperaciones, // oModelOperaciones
                function(empresa) {
                    // Callback cuando se carga exitosamente (empresa != 999)
                    that.loadNemos(empresa);
                    that.loadTipoEquipos(empresa);
                    that._loadFragmentForSociety();
                },
                function(oError) {
                    // Callback cuando hay error
                    console.error("Error al cargar empresa:", oError);
                },
                function() {
                    // Callback cuando empresa es 999 (inicializar diálogo)
                    SocietyHelper.InitSociety(
                        that,
                        function(empresa) {
                            // Callback cuando se selecciona empresa del diálogo
                            that.loadNemos(empresa);
                            that.loadTipoEquipos(empresa);
                            that._loadFragmentForSociety();
                        },
                        [
                            { Code: "", Name: "Elija Uno" },
                            { Code: "100", Name: "TRANSENER S.A." },
                            { Code: "300", Name: "TRANSBA S.A." }
                        ]
                    );
                }
            );
        },

        /**
         * Ejemplo 2: Inicializar diálogo de selección de empresa manualmente
         */
        initSocietyDialog: function() {
            var that = this;
            SocietyHelper.InitSociety(
                this,
                function(empresa) {
                    // Callback cuando se selecciona empresa
                    that.onSocietySelected(empresa);
                },
                [
                    { Code: "", Name: "Elija Uno" },
                    { Code: "100", Name: "TRANSENER S.A." },
                    { Code: "300", Name: "TRANSBA S.A." }
                ]
            );
        },

        /**
         * Ejemplo 3: Obtener empresa actual
         */
        getCurrentEmpresa: function() {
            var sEmpresa = SocietyHelper.getCurrentSociety(this.getView(), "100");
            console.log("Empresa actual:", sEmpresa);
            return sEmpresa;
        },

        /**
         * Ejemplo 4: Usar diálogo de carga genérico
         */
        showBusyDialog: function() {
            var oBusyDialog = SocietyHelper.crearDialogoBusy("Cargando...", "Por favor espere");
            SocietyHelper.abrirDialogoBusy(oBusyDialog);
            
            // Hacer alguna operación asíncrona...
            setTimeout(function() {
                SocietyHelper.cerrarDialogoBusy(oBusyDialog);
            }, 2000);
        },

        // Métodos de ejemplo que el controlador podría tener
        loadNemos: function(empresa) {
            console.log("Cargando NEMOs para empresa:", empresa);
        },

        loadTipoEquipos: function(empresa) {
            console.log("Cargando tipos de equipos para empresa:", empresa);
        },

        _loadFragmentForSociety: function() {
            console.log("Cargando fragment para sociedad");
        },

        onSocietySelected: function(empresa) {
            console.log("Empresa seleccionada:", empresa);
        }
    });
});
