sap.ui.define([
    "sap/ui/model/json/JSONModel"
], function (JSONModel) {
    "use strict";

    return {
      
        getModel: function (sModelName, oView = null) {
            const oTarget = oView || sap.ui.getCore();

            let oModel = oTarget.getModel(sModelName);

            if (!(oModel instanceof sap.ui.model.json.JSONModel)) {
                oModel = new sap.ui.model.json.JSONModel();
                oModel.setSizeLimit(999999);
                oTarget.setModel(oModel, sModelName);
            }

            return oModel;
        }

    };
});
