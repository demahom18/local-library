var BookInstance = require('../models/bookinstance')
var Book = require('../models/book')
const { body, validationResult } = require('express-validator');
var async = require('async')

//Display list of all BookInstances
exports.bookinstance_list = function(req, res, next) {
    BookInstance.find()
        .populate('book')
        .exec(function(err, list_bookinstances) {
            if (err) { return next(err) }

            //Successfull, so render
            res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list: list_bookinstances })
        })
}

//Display detail page for a specific BookInstances
exports.bookinstance_detail = function(req, res, next) {

    BookInstance.findById(req.params.id)
        .populate('book')
        .exec(function(err, bookinstance) {
            if (err) { return next(err) }

            //If BookInstance not found
            if (bookinstance == null) {
                var err = new Error('Book instance not found')
                err.status = 404
                return next(err)
            }

            //Successfull, so render
            res.render('bookinstance_detail', { title: 'Copy: ' + bookinstance.book.title, bookinstance: bookinstance })
        })

}

//Display BookInstance create form on GET
exports.bookinstance_create_get = function(req, res) {
    Book.find({}, 'title')
        .exec(function(err, books) {
            if (err) { return next(err) }

            //Successfull, so render
            res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books })
        })
}

//Handle BookInstance create on POST
exports.bookinstance_create_post = [

    //Validate and sanitise fields
    body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
    body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }).escape(),
    body('status', 'Status must be specified').escape(),
    body('due_back', 'Invalide date').optional({ checkFalsy: true }).isISO8601().toDate(),

    //Process request after validation and sanitization
    (req, res, next) => {

        //Extract the validations errors from a request
        const errors = validationResult(req)

        //Create a BookInstance object with escaped and trimmed data
        var bookinstance = new BookInstance({
            book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back
        });

        if (!errors.isEmpty) {
            //There are errors. Render form again with sanitized values and error messages.
            Book.find({}, 'title')
                .exec(function(err, books) {
                    if (err) { return next(err) }

                    //Successfull, so render
                    res.render('bookinstance_form', {
                        title: 'Create BookInstance',
                        book_list: books,
                        selected_book: bookinstance.book._id,
                        errors: errors.array(),
                        bookinstance: bookinstance
                    })

                    return;
                })

        } else {

            //Data from form is valid
            bookinstance.save(function(err) {
                if (err) { return next(err) }

                //Successfullfull, so redirect to the new bookinstance record page
                res.redirect(bookinstance.url)
            })
        }
    }
]

//Display BookInstance delete form on GET
exports.bookinstance_delete_get = function(req, res, next) {

    async.parallel({
        bookinstance: function(callback) {
            BookInstance.findById(req.params.id)
                .populate('book').exec(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }

        //Success we render
        res.render('bookinstance_delete', {
            title: 'Delete Book Instance',
            bookinstance: results.bookinstance,
            book: results.bookinstance.book
        })
    })
}

//Handle BookInstance delete on POST
exports.bookinstance_delete_post = function(req, res) {
    async.parallel({
        bookinstance: function(callback) {
            BookInstance.findByIdAndDelete(req.params.id)
                .exec(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }

        //Success, it's deleted we redirect to bookinstance_list
        res.redirect('/catalog/bookinstances')
    })
}

//Display BookInstance update form on GET
exports.bookinstance_update_get = function(req, res, next) {

    async.parallel({
        bookinstance: function(callback) {
            BookInstance.findById(req.params.id)
                .populate('book').exec(callback)
        },
        books: function(callback) {
            Book.find({}, 'title')
                .exec(callback)
        }

    }, function(err, results) {
        if (err) { return next(err) }

        //Success, we render
        res.render('bookinstance_form', {
            title: 'Update Book Instance',
            bookinstance: results.bookinstance,
            book_list: results.books,

        })
    })
}

//Handle BookInstance update on POST
exports.bookinstance_update_post = [

    //Validate and sanitise fields
    body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
    body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }).escape(),
    body('status', 'Status must be specified').escape(),
    body('due_back', 'Invalide date').optional({ checkFalsy: true }).isISO8601().toDate(),

    //Process request after validation and sanitization
    (req, res, next) => {

        //Extract the validations errors from a request
        const errors = validationResult(req)

        //Create a BookInstance object with escaped and trimmed data
        var bookinstance = new BookInstance({
            book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back,
            _id: req.params.id
        });

        if (!errors.isEmpty) {
            //There are errors. Render form again with sanitized values and error messages.
            async.parallel({
                bookinstance: function(callback) {
                    BookInstance.find(callback)
                },
                book: function(callback) {
                    Book.find(callback)
                }

            }, function(err, results) {
                if (err) { return next(err) }

                //Success, we render
                res.render('bookinstance_form', {
                    title: 'Update Book Instance',
                    bookinstance: results.bookinstance,
                    book_list: results.books,
                    errors: errors.array()

                })
            })
        } else {

            //Data from form is valid, Update author with escaped and trimmed data
            BookInstance.findByIdAndUpdate(req.params.id, bookinstance, function(err, bookinstance_updated) {
                if (err) { return next(err) }

                //Success, we redirect to the genre updated page
                res.redirect(bookinstance_updated.url)
            })
        }
    }

]