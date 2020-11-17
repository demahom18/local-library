var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookinstance');
const { body, validationResult } = require('express-validator');

var async = require('async');
const { update } = require('../models/bookinstance');

exports.index = function(req, res) {

    async.parallel({
        book_count: function(callback) {
            Book.countDocuments({}, callback); // Pass an empty object as match condition to find all documents of this collection
        },
        book_instance_count: function(callback) {
            BookInstance.countDocuments({}, callback);
        },
        book_instance_available_count: function(callback) {
            BookInstance.countDocuments({ status: 'Available' }, callback);
        },
        author_count: function(callback) {
            Author.countDocuments({}, callback);
        },
        genre_count: function(callback) {
            Genre.countDocuments({}, callback);
        }
    }, function(err, results) {
        res.render('index', { title: 'Local Library Home', error: err, data: results });
    });
};

// Display list of all books.
exports.book_list = function(req, res, next) {

    Book.find({}, 'title author')
        .populate('author')
        .exec(function(err, list_books) {
            if (err) { return next(err) }

            //Successfull, so render
            res.render('book_list', { title: 'Book List', book_list: list_books })
        })
};

// Display detail page for a specific book.
exports.book_detail = function(req, res, next) {

    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
                .populate('genre')
                .populate('author')
                .exec(callback)
        },
        book_instance: function(callback) {
            BookInstance.find({ 'book': req.params.id })
                .exec(callback)
        }

    }, function(err, results) {
        if (err) { return next(err) }

        if (results.book == null) {
            //If no book is found
            var err = new Error('Book not found')
            err.status = 404
            return next(err)
        }

        //Successfull, so render
        res.render('book_detail', { title: results.book.title, book: results.book, book_instances: results.book_instance })
    })
};

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {

    //First we get all authors and genres, which we can use for adding to our book
    async.parallel({
        authors: function(callback) {
            Author.find(callback)
        },
        genres: function(callback) {
            Genre.find(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }

        //Then we render
        res.render('book_form', { title: 'Create Book', authors: results.authors, genres: results.genres })
    })
};

// Handle book create on POST.
exports.book_create_post = [

    //Convert the genre to an array
    (req, res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre === 'undefined')
                req.body.genre = []
            else {
                req.body.genre = new Array(req.body.genre)
            }
        }
        next();
    },

    //Validate and sanitise the fields
    body('title', 'Title must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('author', 'Author must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('isbn', 'ISBN must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('genre.*').escape(),

    //Process request after validation and sanitization
    (req, res, next) => {

        //Extract the validation and sanitization
        const errors = validationResult(req)

        //Create a Book Object with escaped and trimmed data
        var book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre
        })
        if (!errors.isEmpty) {

            //There are errors. Render form again with sanitized values/error messages
            //Get all authors and genres for form
            async.parallel({
                authors: function(callback) {
                    Author.find(callback);
                },
                genres: function(callback) {
                    Genre.find(callback);
                },
            }, function(err, results) {
                if (err) { return next(err); }

                // Mark our selected genres as checked.
                for (let i = 0; i < results.genres.length; i++) {
                    if (book.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked = 'true';
                    }
                }
                res.render('book_form', { title: 'Create Book', authors: results.authors, genres: results.genres, book: book, errors: errors.array() });
            })
            return
        } else {
            //Data from form is valid. Save the book
            book.save(function(err) {
                if (err) { return next(err) }

                //Successfull - redirect to new book record
                res.redirect(book.url)
            })
        }


    }
]

// Display book delete form on GET.
exports.book_delete_get = function(req, res, next) {

    //Get book authors and genres for form
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
                .populate('author').populate('genre')
                .exec(callback)
        },
        book_instances: function(callback) {
            BookInstance.find({ 'book': req.params.id })
                .exec(callback)
        }
    }, function(err, results) {

        if (err) { return next(err) }

        if (results.book == null) {
            //No book found
            var err = new Error('Book not found')
            err.status = 404
            return next(err)
        }

        if (results.book_instances.length > 0) {
            //There are bookinstances of this book
            res.render('book_delete', { title: 'Delete Book', book: results.book, book_instances: results.book_instances })
            return
        }

        //Success, so render
        res.render('book_delete', { title: 'Delete Book', authors: results.authors, genres: results.genres, book: results.book })

    })

};

// Handle book delete on POST.
exports.book_delete_post = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
                .populate('author').populate('genre')
                .exec(callback)
        }
    }, function(err, results) {

        if (err) { return next(err) }

        //Success, we delete and redirect to the books list
        Book.findByIdAndDelete(req.params.id, function(err) {
            if (err) { return next(err) }

            //Successfull deleted, we redirect to the list of authors
            res.redirect('/catalog/books')
        })
    })
};

// Display book update form on GET.
exports.book_update_get = function(req, res, next) {

    //Get book authors and genres for form
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
                .populate('author').populate('genre')
                .exec(callback)
        },
        authors: function(callback) {
            Author.find(callback) //We list all the Author objects in the collection
        },
        genres: function(callback) {
            Genre.find(callback) //We list all the Genre objects in the collection
        }
    }, function(err, results) {
        if (err) { return next(err) }

        if (results.book == null) {
            //No book found
            var err = new Error('Book not found')
            err.status = 404
            return next(err)

        }

        //Success,
        //We have to mark our selected genres as checked  
        for (var all_g_iter = 0; all_g_iter < results.genres.length; all_g_iter++) {
            for (var book_g_iter = 0; book_g_iter < results.book.genre.length; book_g_iter++) {
                if (results.genres[all_g_iter]._id.toString() === results.book.genre[book_g_iter]._id.toString()) {
                    results.genres[all_g_iter].checked = true
                }
            }
        }

        //Now we render
        res.render('book_form', { title: 'Update Book', authors: results.authors, genres: results.genres, book: results.book })
    })
};

// Handle book update on POST.
exports.book_update_post = [

    //Convert the genre to an array
    (req, res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre === 'undefined') {
                req.body.genre = []
            } else {
                req.body.genre = new Array(req.body.genre)
            }
        }
        next()
    },

    //Validate and sanitise fields
    body('title', 'Title must not be empty').trim().isLength({ min: 1 }).escape(),
    body('author', 'Author must not be empty').trim().isLength({ min: 1 }).escape(),
    body('summary', 'summary must not be empty').trim().isLength({ min: 1 }).escape(),
    body('isbn', 'isbn must not be empty').trim().isLength({ min: 1 }).escape(),
    body('genre.*').escape(),

    //Process request after validation and sanitization
    (req, res, next) => {

        //Extract the validation errors from a request
        const errors = validationResult(req)

        //Create a Book object with escaped/trimmed data and old id
        var book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: (typeof req.body.genre === 'undefined') ? [] : req.body.genre,
            _id: req.params.id //This is required or a new _id will be assigned 

        })

        if (!errors.isEmpty()) {

            //there are errors, we render again with sanitized values/errors messages

            //Get book authors and genres for form
            async.parallel({
                authors: function(callback) {
                    Author.find(callback)
                },
                genres: function(callback) {
                    Genre.find(callback)
                }
            }, function(req, results) {
                if (err) { return next(err) }

                //Mark our selected genres as checked
                for (let i = 0; i < results.genres.length; i++) {
                    if (book.genre.indexOf(results.genres[i]._id > -1)) {
                        results.genres[i].checked = true
                    }
                }
                res.render('book_form', {
                    title: 'Update Book',
                    authors: results.authors,
                    genres: results.genres,
                    book: book,
                    errors: errors.array()
                })

                return
            })

        } else {

            //Data from the form is valid, we update the record
            Book.findByIdAndUpdate(req.params.id, book, function(err, thebook) {
                if (err) { return next(err) }

                //Successfull, so redirect to book detail page
                res.redirect(thebook.url)
            })
        }
    }



]