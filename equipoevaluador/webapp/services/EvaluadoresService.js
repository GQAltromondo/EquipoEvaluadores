sap.ui.define([
], function() {
	"use strict";

	return {

		LoadSearch : function(onSuccessCallback, onErrorCallback) {	
		var url = "destinations/Examinadores_PT15/Groups/5b58d776ee20fd5c8981be73";
            var JsonModel = new sap.ui.model.json.JSONModel();
            JsonModel.attachRequestCompleted(onSuccessCallback);
            JsonModel.attachRequestFailed(onErrorCallback);
            JsonModel.loadData(url, "", true);
		},
		
		_getEmailEvaluador : function(Evaluador,onSuccessCallback,onErrorCallback){
            var JsonModel = new sap.ui.model.json.JSONModel();
            JsonModel.attachRequestCompleted(Evaluador, onSuccessCallback);
            JsonModel.attachRequestFailed(onErrorCallback);
            JsonModel.loadData(Evaluador.$ref, "", true);	
		}
	};
});