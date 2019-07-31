var gulp = require('gulp');
var sass = require('gulp-sass');

gulp.task('css', function () {
    return gulp.src('./style.scss')
        .pipe(sass({ outputStyle: 'compressed', includePaths: 'node_modules' }).on('error', sass.logError))
        .pipe(gulp.dest("./"));
});

gulp.task('default', gulp.series('css'));

gulp.task('watch', gulp.series('default', function () {
    return gulp.watch('*.scss', gulp.series('default'));
}));