var async = require('async')
var mongoose = require('mongoose');
var Genre = require('../models/genre');
var Book = require('../models/book')
const { body, validationResult } = require('express-validator');
const author = require('../models/author');


// Display list of all Genre.
exports.genre_list = function(req, res, next) {
    Genre.find()
        .sort([
            ['name', 'ascending']
        ])
        .exec(function(err, list_genres) {
            if (err) { return next(err) }

            //Successfull, so render
            res.render('genre_list', { title: 'Genre List', genre_list: list_genres })
        })
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next) {

    var id = mongoose.Types.ObjectId(req.params.id)

    async.parallel({

        genre: function(callback) {
            Genre.findById(id)
                .exec(callback)
        },
        genre_books: function(callback) {
            Book.find({ 'genre': id })
                .exec(callback)
        },
    }, function(err, results) {

        if (err) { return next(err) }
        if (results.genre == null) {
            //No results found
            var err = new Error('Genre not found')
            err.status = 404
            return next(err)
        }

        //Successfull, so render
        res.render('genre_detail', { title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books })
    })
};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res) {
    res.render('genre_form', { title: 'Create genre' })
};

// Handle Genre create on POST.
exports.genre_create_post = [

    //Validate and sanitise the name field
    body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),

    //Process request after validation and sanitization
    (req, res, next) => {

        //Extract the validation errors from a request
        const errors = validationResult(req)

        //Create a genre object with escaped and trimmed data
        var genre = new Genre({ name: req.body.name })

        if (!errors.isEmpty()) {

            //There are errors. We render the form again with sanitized values/errors messages
            res.render('genre_form', { title: 'Create Genre', genre: genre, errors: errors.array() });
            return
        } else {
            //Data from the form is valid
            //Check if genre with the same name already exists
            Genre.findOne({ 'name': req.body.name })
                .exec(function(err, found_genre) {
                    if (err) { return next(err) }

                    if (found_genre) {
                        //Genre exists redirect to its detail page
                        res.redirect(found_genre.url)
                    } else {
                        genre.save(function(err) {
                            if (err) { return next(err) }

                            //Genre saved, redirect to genre detail page
                            res.redirect(genre.url)
                        })
                    }
                })
        }


    }
];

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res, next) {

    async.parallel({
        genre: function(callback) {
            Genre.findById(req.params.id).exec(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }

        //Success we render
        res.render('genre_delete', { title: 'Delete Genre', genre: results.genre })

    })
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res, next) {
    async.parallel({
        genre: function(callback) {
            Genre.findByIdAndDelete(req.params.id).exec(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }

        //Success, the genre is deleted, we redirect to genres list
        res.redirect('/catalog/genres')
    })
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res, next) {


    //Get the genre from the db 
    async.parallel({
        genre: function(callback) {
            Genre.findById(req.params.id).exec(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }

        //Success, we render
        res.render('genre_form', { title: 'Update Genre', genre: results.genre })
    })
};

// Handle Genre update on POST.
exports.genre_update_post = [

    //Validate and sanitise the name field
    body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),

    //Process request after validation and sanitization
    (req, res, next) => {

        //Extract the validation errors from a request
        const errors = validationResult(req)

        //Create a new object with escaped and trimmed data
        var genre = new Genre({ name: req.body.name, _id: req.params.id })

        if (!errors.isEmpty()) {
            //There are errors, we render with sanitized value

            //We always have to get the genre infos in the db
            async.parallel({
                genre: function(callback) {
                    Genre.find(callback)
                }
            }, function(err, results) {
                if (err) { return next(err) }

                res.render('genre_form', { title: 'Update Genre', genre: results.genre, errors: errors.array() })

                return
            })

        } else {
            //Data from form is valid, Update author with escaped and trimmed data
            Genre.findByIdAndUpdate(req.params.id, genre, function(err, genre_updated) {
                if (err) { return next(err) }

                //Success, we redirect to the genre updated page
                res.redirect(genre_updated.url)
            })
        }

        //
    }
]