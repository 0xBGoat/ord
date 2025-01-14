#!/bin/bash

# Check if both arguments are provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 <prefix> <fee-rate>"
    echo "Example: $0 abc 5"
    exit 1
fi

prefix=$1
fee_rate=$2
commit_fee_rate=$(echo "$fee_rate + 0.1" | bc)
echo "Searching for transaction with prefix: $prefix (fee rate: $fee_rate, commit fee rate: $commit_fee_rate)"

counter=0

while true; do
    # Run the ord command once and capture its output
    output=$(./ord wallet --name pizzapets batch --fee-rate "$fee_rate" --commit-fee-rate "$commit_fee_rate" --batch batch.yaml --dry-run)
    
    # Check if this output has our desired prefix
    if echo "$output" | jq -e --arg prefix "$prefix" '
        select(.reveal[0:3] == $prefix) | 
        { commit_hex, reveal_hex, reveal_tx: .reveal }
    ' >/dev/null; then
        echo -e "\nFound matching transaction after $counter attempts!"
        echo "$output" | jq -r --arg prefix "$prefix" 'select(.reveal[0:3] == $prefix) | { commit_hex, reveal_hex, reveal_tx: .reveal }'
        exit 0
    fi
    
    counter=$((counter + 1))
    if [[ $((counter % 10)) -eq 0 ]]; then
        echo -n "." # Progress indicator every 10 attempts
    fi
done 