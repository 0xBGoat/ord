#!/usr/bin/env node

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

// Check command line arguments
if (process.argv.length !== 4) {
    console.log('Usage: node create-feed-tx.js <prefix> <fee-rate>');
    console.log('Example: node create-feed-tx.js abc 5');
    process.exit(1);
}

const prefix = process.argv[2];
const feeRate = process.argv[3];
const commitFeeRate = (parseFloat(feeRate) + 0.1).toFixed(1);

// Number of parallel processes to run
const NUM_WORKERS = 4;
let counter = 0;
let foundMatch = null;

async function runOrdCommand() {
    try {
        const { stdout } = await execFileAsync('./ord', [
            'wallet',
            '--name', 'pizzapets',
            'batch',
            '--fee-rate', feeRate,
            '--commit-fee-rate', commitFeeRate,
            '--batch', 'batch.yaml',
            '--dry-run'
        ]);
        return JSON.parse(stdout);
    } catch (error) {
        console.error('Error executing ord command:', error.message);
        return null;
    }
}

async function worker() {
    while (!foundMatch) {
        const output = await runOrdCommand();
        counter++;
        
        if (counter % 100 === 0) {
            process.stderr.write('.');
        }
        
        if (!output) {
            continue;
        }
        
        if (output.reveal.substring(0, 3) === prefix) {
            foundMatch = {
                commit_hex: output.commit_hex,
                reveal_hex: output.reveal_hex,
                reveal_tx: output.reveal
            };
            break;
        }
    }
}

async function findMatchingTransaction() {
    console.log(`Searching for transaction with prefix: ${prefix} (fee rate: ${feeRate}, commit fee rate: ${commitFeeRate})`);
    console.log(`Running with ${NUM_WORKERS} parallel workers\n`);
    
    // Create array of worker promises
    const workers = Array(NUM_WORKERS).fill().map(() => worker());
    
    // Wait for any worker to find a match
    await Promise.race(workers);
    
    if (foundMatch) {
        console.log(`\nFound matching transaction after ${counter} attempts!`);
        console.log(JSON.stringify(foundMatch, null, 2));
    }
}

// Start the search
findMatchingTransaction().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
}); 