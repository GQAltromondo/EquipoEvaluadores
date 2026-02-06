sap.ui.define([
	"transener/equipoevaluador/services/oDataService"
], function(oDataService) {
	"use strict";

	return {

		LoadSearch: function(filter, onSuccessCallback, onErrorCallback) {
			var filters = [];
			
			// Si hay un filtro y no está vacío, crear filtros de búsqueda
			if (filter && filter.trim() !== "") {
				var sFilterValue = filter.trim();
				var oFilter = new sap.ui.model.Filter({
					filters: [
						new sap.ui.model.Filter("Nombre", sap.ui.model.FilterOperator.Contains, sFilterValue),
						new sap.ui.model.Filter("Apellido", sap.ui.model.FilterOperator.Contains, sFilterValue),
						new sap.ui.model.Filter("Legajo", sap.ui.model.FilterOperator.Contains, sFilterValue)
					],
					and: false
				});
				filters.push(oFilter);
			}
			
			var odataModel = oDataService.getModel();
			var oReadOptions = {
				success: onSuccessCallback,
				error: onErrorCallback
			};
			
			// Solo agregar filtros si hay alguno
			if (filters.length > 0) {
				oReadOptions.filters = filters;
			}
			
			odataModel.read("/PersonalInternoMtoSet", oReadOptions);
		}
	};
});