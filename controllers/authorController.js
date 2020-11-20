var Author = require('../models/author')
var Book = require('../models/book')
var async = require('async')
const { body, validationResult } = require('express-validator');

//Display list of all Authors
exports.author_list = function(req, res, next) {
    Author.find()
        .sort([
            ['family_name', 'ascending']
        ])
        .exec(function(err, list_authors) {
            if (err) { return next(err) }

            //Successfull, so render

            res.render('author_list', { title: 'Author List', author_list: list_authors })
        })
}

//Display detail page for spécific Author
exports.author_detail = function(req, res, next) {

    async.parallel({
        author: function(callback) {
            Author.findById(req.params.id)
                .exec(callback)

        },
        author_books: function(callback) {
            Book.find({ 'author': req.params.id }, 'title summary')
                .exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err) }

        //If no Author found
        if (results.author == null) {
            var err = new Error('Author not found')
            err.status = 404
            return next(err)
        }

        //Successfull, so render
        res.render('author_detail', { title: 'Author Detail', author: results.author, author_books: results.author_books })
    })
}

//Display Author create form on GET.
exports.author_create_get = function(req, res) {
    res.render('author_form', { title: 'Create Author' })
}

//Handle Author create on POST
exports.author_create_post = [

    //Validate and sanitise fields
    body('first_name').trim().isLength({ min: 1 }).escape()
    .withMessage('First name must be specified.')
    .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),

    body('family_name').trim().isLength({ min: 1 }).escape()
    .withMessage('Family name must be specified.')
    .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),

    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true })
    .isISO8601().toDate(),

    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true })
    .isISO8601().toDate(),

    //Process request after validation and sanitization
    (req, res, next) => {

        //Extract the validations errors from a request
        const errors = validationResult(req)

        if (!errors.isEmpty()) {

            //There are errors. Render form again with sanitized values/errors messages
            res.render('author_create', { title: 'Create Author', author: req.body, errors: errors.array() })
            return
        } else {
            //Data from form is valid
            //Create an author object with escaped and trimmed data
            var author = new Author({
                first_name: req.body.first_name,
                family_name: req.body.family_name,
                date_of_birth: req.body.date_of_birth,
                date_of_death: req.body.date_of_death,
            })

            author.save(function(err) {
                if (err) { return next(err) }

                //Successfull-Redirect to author record
                res.redirect(author.url)
            })
        }

    }
]





//Display Author delete form on GET
exports.author_delete_get = function(req, res, next) {
    async.parallel({
        author: function(callback) {
            Author.findById(req.params.id)
                .exec(callback)
        },
        authors_book: function(callback) {
            Book.find({ 'author': req.params.id })
                .exec(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }

        if (results.author == null) {
            // No results
            res.redirect('/catalog/authors')
        }

        //Successfull, so render
        res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.authors_book })
    })
}

//Handle Author delete on POST
exports.author_delete_post = function(req, res, next) {
    async.parallel({
        author: function(callback) {
            Author.findById(req.body.authorid)
                .exec(callback)
        },
        authors_book: function(callback) {
            Book.find({ 'author': req.body.authorid })
                .exec(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }

        //Success, we check if the author has any books first
        if (results.authors_book.length > 0) {
            //Author has Books, render 
            res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.authors_book })
            return
        }

        //Author has no books. Delete object and redirect to the list of authors
        Author.findByIdAndRemove(req.body.authorid, function deleteAuthor(err) {
            if (err) { return next(err) }

            //Success, go to author list
            res.redirect('/catalog/authors')
        })


    })
}

//Display Author update form on GET
exports.author_update_get = function(req, res, next) {

    //Get the author infos from the db
    async.parallel({
        author: function(callback) {
            Author.findById(req.params.id).exec(callback)
        }

    }, function(err, results) {
        if (err) { return next(err) }

        if (results.author == null) {
            //No author found
            var err = new Error('Author not found')
            err.status = 404
            return next(err)

        }

        //Success, we render
        res.render('author_form', { title: 'Update Author', author: results.author })
    })
}

//Handle Author update on POST
exports.author_update_post = [

    //Validate and sanitise fields
    body('first_name').trim().isLength({ min: 1 }).escape()
    .withMessage('First name must be specified.')
    .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),

    body('family_name').trim().isLength({ min: 1 }).escape()
    .withMessage('Family name must be specified.')
    .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),

    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true })
    .isISO8601().toDate(),

    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true })
    .isISO8601().toDate(),

    //Process request after validation and sanitization
    (req, res, next) => {

        //Extract the validations errors from a request
        const errors = validationResult(req)

        var author = new Author({
            first_name: req.body.first_name,
            family_name: req.body.family_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: req.body.date_of_death,
            _id: req.params.id //This impeach the creation of another object.
        })

        if (!errors.isEmpty()) {

            //there are errors, we render again with sanitized values/errors messages

            //Get book authors and genres for form
            async.parallel({
                authors: function(callback) {
                    Author.find(callback)
                }
            }, function(err, results) {
                if (err) { return next(err) }


                res.render('book_form', {
                    title: 'Update Author',
                    author: results.author,
                    errors: errors.array()
                })

                return
            })

        } else {
            //Data from form is valid
            //Update author object with escaped and trimmed data
            Author.findByIdAndUpdate(req.params.id, author, function(err, author_updated) {
                if (err) { return (next(err)) }

                //Success we redirect to the author's page detail
                res.redirect(author_updated.url)
            })
        }

    }

]