const Metalsmith = require('metalsmith');
const Handlebars = require('handlebars');
const rm = require('rimraf').sync;
module.exports = function (metadata = {}, src = './tpl', dest = '.') {
    if (!src) {
        return Promise.reject(new Error(`无效的source：${src}`))
    }
    return new Promise((resolve, reject) => {
    Metalsmith(process.cwd())
        .metadata(metadata.answers)
        .clean(false)
        .source(src)
        .destination(dest)
        .use((files, metalsmith, done) => {
            const meta = metalsmith.metadata();
            console.log('meta',meta)
            Object.keys(files).forEach(fileName => {
                console.log(2222)
                const t = files[fileName].contents.toString();
                files[fileName].contents = new Buffer(Handlebars.compile(t)(meta));
            })
            done()
        })
        .build((err,files) => {
            err ? reject(err) : resolve();
        })
  })
}