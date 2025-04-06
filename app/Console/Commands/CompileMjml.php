<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

class CompileMjml extends Command
{
    protected $signature = 'mjml:compile';
    protected $description = 'Compile MJML templates to HTML';

    public function handle()
    {
        $mjmlDir = resource_path('views/emails/mjml');
        $htmlDir = resource_path('views/emails/compiled');

        if (!File::exists($htmlDir)) {
            File::makeDirectory($htmlDir, 0755, true);
        }

        $files = File::glob("$mjmlDir/*.mjml");

        foreach ($files as $file) {
            $filename = basename($file, '.mjml');
            $outputPath = "$htmlDir/$filename.blade.php";

            $mjmlPath = base_path('node_modules/.bin/mjml.cmd');

            $process = new Process([
                $mjmlPath,
                $file,
                '-o',
                $outputPath
            ]);

            $process->run();

            if ($process->isSuccessful()) {
                $this->info("Compiled $filename.mjml to HTML");
            } else {
                $this->error("Failed to compile $filename.mjml");
                $this->error($process->getErrorOutput());
            }
        }
    }
}
