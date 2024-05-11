const kue = require('kue');
const express = require('express');
const serveStatic = require('serve-static');
const path = require('path');
const port = 3000;
// create our job queue
const jobs = kue.createQueue(),
    Job = kue.Job;

// start redis with $ redis-server
// create some jobs at random,
// usually you would create these
// in your http processes upon
// user input etc.

function create() {
    const name = ['tobi', 'loki', 'jane', 'manny'][(Math.random() * 4) | 0];
    console.log('- creating job for %s', name);
    jobs.create('video conversion', {
        title: 'converting ' + name + "'s to avi",
        user: 1,
        frames: 200,
    }).save();

    setTimeout(create, (Math.random() * 3000) | 0);
}

create();

// process video conversion jobs, 3 at a time.

jobs.process('video conversion', 3, function (job, done) {
    const frames = job.data.frames;
    console.log('job process %d', job.id);
    function next(i) {
        // pretend we are doing some work
        convertFrame(i, function (err) {
            if (err) return done(err);
            // report progress, i/frames complete
            job.progress(i, frames);
            if (i == frames) done();
            else next(i + 5);
        });
    }

    next(0);
});

function convertFrame(i, fn) {
    setTimeout(fn, Math.random() * 100);
}

// remove stale jobs
jobs.on('job complete', function (id) {
    Job.get(id, function (err, job) {
        if (err) return;
        job.remove(function (err) {
            if (err) throw err;
            console.log('removed completed job #%d', job.id);
        });
    });
});

// start the UI
const app = express();
app.use(
    serveStatic(path.join(__dirname, 'dist'), {
        // cacheControl,
        // setHeaders
        maxAge: '1d',
    }),
);
app.use('/kue-ui', kue.app);
app.listen(port, () => {
    console.log(`UI started on http://localhost:${port}`);
});
