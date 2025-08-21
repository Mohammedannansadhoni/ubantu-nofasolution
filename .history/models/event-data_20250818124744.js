var mongoose = require('mongoose')
var Schema = mongoose.Schema;

var schema = new Schema({
    event: {type:Schema.Types.ObjectId, ref: 'Event'},
    
    
    

    uniqueId: {type:String},
    barcode: {type:String},
        qrCode: {type:String},
    sno: {type:String},
    title: {type:String},
    firstName: {type:String},
    middleName: {type:String},
    lastName: {type:String},
    fullName: {type:String},
    jobTitle: {type:String},
    department: {type:String},
    companyName: {type:String},
    mobile1: {type:String},
    mobile2: {type:String},
    tel1: {type:String},
    tel2: {type:String},
    fax: {type:String},
    email: {type:String},
    website: {type:String},
    address1: {type:String},
    address2: {type:String},
    city: {type:String},
    country: {type: String},
    poBox: {type:String},
    postalCode: {type:String},
    badgeCategory: {type: String},
    regType: {type:String},
    regDate: {type:String},
    badgePrintDate: {type:String},
    modifiedDate: {type:String},
    statusFlag: {type:String},
    backoffice: {type:String},
    comment1: {type:String},
    comment2: {type:String},
    comment3: {type:String},
    comment4: {type:String},
    comment5: {type:String},
    comment6: {type:String},
    comment7: {type:String},
    comment8: {type:String},
    comment9: {type:String},
    comment10: {type:String},
    username: {type:String}
})

module.exports = mongoose.model('EventData', schema)