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
# Pre-create the JQ filter once
jq_filter='select(.reveal[0:3] == $prefix) | { commit_hex, reveal_hex, reveal_tx: .reveal }'

while true; do
    # Store output but use process substitution to avoid subshell
    output=$(./ord wallet --name pizzapets --no-sync batch --fee-rate "$fee_rate" --commit-fee-rate "$commit_fee_rate" --batch batch.yaml --dry-run)
    
    if echo "$output" | jq -e --arg prefix "$prefix" "$jq_filter" >/dev/null; then
        echo -e "\nFound matching transaction after $counter attempts!"
        echo "$output" | jq -r --arg prefix "$prefix" "$jq_filter"
        exit 0
    fi
    
    counter=$((counter + 1))
    # Reduce I/O operations by printing less frequently
    if [[ $((counter % 100)) -eq 0 ]]; then
        echo -n "." >&2
    fi
done 