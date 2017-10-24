'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');

const {DATABASE_URL, PORT} = require('./config');
const {BlogPost} = require('./models');

const app = express();

app.use(morgan('common'));
app.use(bodyParser.json());

mongoose.Promise = global.Promise;

// Get
app.get('/posts', (req, res) => {
  BlogPost
    .find()
    .then(posts => {
      res.json(posts.map(post => post.apiRepr()));
    })
    .catch(e => {
      console.error(e);
      res.status(500).json({error: 'something went terribly wrong'});
    });
});

// Get
app.get('/posts/:id', (req, res) => {
  BlogPost
    .findById(req.params.id)
    .then(post => res.json(post.apiRepr()))
    .catch(e => {
      console.error(e);
      res.status(500).json({error: 'something went horribly awry'});
    });
});

// Post
app.post('/posts', (req, res) => {
  const requiredFields = ['title', 'content', 'author'];
  for (let i=0; i<requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }

  BlogPost
    .create({
      title: req.body.title,
      content: req.body.content,
      author: req.body.author
    })
    .then(blogPost => res.status(201).json(blogPost.apiRepr()))
    .catch(e => {
      console.error(e);
      res.status(500).json({error: 'Something went wrong'});
    });

});

// Delete
app.delete('/posts/:id', (req, res) => {
  BlogPost
    .findByIdAndRemove(req.params.id)
    .then(() => {
      res.status(204).json({message: 'success'});
    })
    .catch(e => {
      console.error(e);
      res.status(500).json({error: 'something went terribly wrong'});
    });
});

// Put
app.put('/posts/:id', (req, res) => {
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    res.status(400).json({
      error: 'Request path id and request body id values must match'
    });
  }

  const updated = {};
  const updateableFields = ['title', 'content', 'author'];
  updateableFields.forEach(field => {
    if (field in req.body) {
      updated[field] = req.body[field];
    }
  });

  BlogPost
    .findByIdAndUpdate(req.params.id, {$set: updated}, {new: true})
    .then(updatedPost => res.status(204).end())
    .catch(e => res.status(500).json({message: 'Something went wrong'}));
});

// Delete
app.delete('/:id', (req, res) => {
  BlogPosts
    .findByIdAndRemove(req.params.id)
    .then(() => {
      console.log(`Deleted blog post with id \`${req.params.ID}\``);
      res.status(204).end();
    });
});

app.use('*', function(req, res) {
  res.status(404).json({message: 'Not Found'});
});

let server;

// Run Server
function runServer(databaseUrl=DATABASE_URL, port=PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, e => {
      if (e) {
        return reject(e);
      }
      server = app.listen(port, () => {
        console.log(`Your app is listening on port ${port}`);
        resolve();
      })
        .on('error', e => {
          mongoose.disconnect();
          reject(e);
        });
    });
  });
}
// Close Server
function closeServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log('Closing server');
      server.close(e => {
        if (e) {
          return reject(e);
        }
        resolve();
      });
    });
  });
}

if (require.main === module) {
  runServer().catch(e => console.error(e));
}

module.exports = {runServer, app, closeServer};
