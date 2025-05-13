<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class MinifyBladeTemplates extends Command
{
    protected $signature = 'blade:minify {source?} {destination?}';
    protected $description = 'Minify blade templates to a destination directory';

    public function handle()
    {
        $source = $this->argument('source') ?? resource_path('views/emails/compiled');
        $destination = $this->argument('destination') ?? resource_path('views/emails/minified');
        
        // Create destination directory if it doesn't exist
        if (!File::exists($destination)) {
            File::makeDirectory($destination, 0755, true);
        }
        
        $this->minifyDirectory($source, $destination);
        $this->info('Blade templates minified successfully!');
    }

    protected function minifyDirectory($sourceDir, $destDir)
    {
        // Create destination directory if it doesn't exist
        if (!File::exists($destDir)) {
            File::makeDirectory($destDir, 0755, true);
        }
        
        $files = File::files($sourceDir);
        
        foreach ($files as $file) {
            $filename = pathinfo($file, PATHINFO_BASENAME);
            $destFile = $destDir . '/' . $filename;
            
            if (pathinfo($file, PATHINFO_EXTENSION) === 'php') {
                $this->minifyFile($file, $destFile);
            } else {
                // Copy non-PHP files as-is
                File::copy($file, $destFile);
            }
        }
        
        $directories = File::directories($sourceDir);
        foreach ($directories as $dir) {
            $dirName = basename($dir);
            $this->minifyDirectory($dir, $destDir . '/' . $dirName);
        }
    }

    protected function minifyFile($sourceFile, $destFile)
    {
        $content = File::get($sourceFile);
        
        // Preserve Blade directives and PHP code
        $content = preg_replace_callback('/\{\{.*?\}\}|\{!!.*?!!\}|\@[^(\s|$)]+(\s*\(.*?\)|\s*\{.*?\})?/s', function($match) {
            return '###BLADE_TOKEN_' . base64_encode($match[0]) . '###';
        }, $content);
        
        // Minify HTML
        $content = preg_replace('/\s+/', ' ', $content); // Replace multiple spaces with single space
        $content = preg_replace('/>\s+</', '><', $content); // Remove spaces between tags
        $content = preg_replace('/<!--(?!<!)[^\[>].*?-->/', '', $content); // Remove HTML comments (except conditional comments)
        
        // Restore Blade directives and PHP code
        $content = preg_replace_callback('/###BLADE_TOKEN_(.*?)###/', function($match) {
            return base64_decode($match[1]);
        }, $content);
        
        File::put($destFile, $content);
    }
}
