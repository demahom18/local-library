var mongoose = require('mongoose');
const { DateTime } = require('luxon')

var Schema = mongoose.Schema;

var AuthorSchema = new Schema({
    first_name: { type: String, required: true, maxlength: 100 },
    family_name: { type: String, required: true, maxlength: 100 },
    date_of_birth: { type: Date },
    date_of_death: { type: Date },
});


// Virtual for author's full name
AuthorSchema
    .virtual('name')
    .get(function() {
        return this.family_name + ', ' + this.first_name;
    });

// Virtual for author's lifespan
AuthorSchema
    .virtual('lifespan')
    .get(function() {
        return (this.date_of_death.getYear() - this.date_of_birth.getYear()).toString();
    });

//Virtual for lifespan formatted
AuthorSchema
    .virtual('lifespan_formatted')
    .get(function() {

        var date_of_birth = this.date_of_birth ? DateTime.fromJSDate(this.date_of_birth).toLocaleString(DateTime.DATE_MED) : ''
        var date_of_death = this.date_of_death ? DateTime.fromJSDate(this.date_of_death).toLocaleString(DateTime.DATE_MED) : ''

        return date_of_birth + ' - ' + date_of_death
    });

// Virtual for author's URL
AuthorSchema
    .virtual('url')
    .get(function() {
        return '/catalog/author/' + this._id;
    });

//Virtual for the Date of Birth format
AuthorSchema
    .virtual('date_of_birth_formatted')
    .get(function() {

        return this.date_of_birth ?
            DateTime.fromJSDate(this.date_of_birth).toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY) : ''
    });

//Virtual for the Date of Death format
AuthorSchema
    .virtual('date_of_death_formatted')
    .get(function() {
        return this.date_of_death ?
            DateTime.fromJSDate(this.date_of_death).toLocaleString(DateTime.DATE_MED) : ''
    });

module.exports = mongoose.model('Author', AuthorSchema);