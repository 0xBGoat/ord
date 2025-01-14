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

async function findMatchingTransaction() {
    console.log(`Searching for transaction with prefix: ${prefix} (fee rate: ${feeRate}, commit fee rate: ${commitFeeRate})`);
    
    let counter = 0;
    
    while (true) {
        const output = await runOrdCommand();
        
        if (!output) {
            console.error('Failed to execute ord command. Retrying...');
            continue;
        }
        
        if (output.reveal.substring(0, 3) === prefix) {
            console.log(`\nFound matching transaction after ${counter} attempts!`);
            console.log(JSON.stringify({
                commit_hex: output.commit_hex,
                reveal_hex: output.reveal_hex,
                reveal_tx: output.reveal
            }, null, 2));
            break;
        }
        
        counter++;
        if (counter % 100 === 0) {
            process.stderr.write('.');
        }
    }
}

// Start the search
findMatchingTransaction().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
}); 