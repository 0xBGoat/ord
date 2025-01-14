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
    # Run the ord command and process with a single jq command
    result=$(./ord wallet --name pizzapets batch --fee-rate "$fee_rate" --commit-fee-rate "$commit_fee_rate" --batch batch.yaml --dry-run | \
    jq -r --arg prefix "$prefix" '
        . as $full |
        if (.reveal[0:3] == $prefix) then
            {
                found: true,
                result: { commit_hex: .commit_hex, reveal_hex: .reveal_hex, reveal_tx: .reveal }
            }
        else
            { found: false }
        end
    ')
    
    counter=$((counter + 1))
    if [[ $((counter % 10)) -eq 0 ]]; then
        echo -n "." # Progress indicator every 10 attempts
    fi
    
    if echo "$result" | jq -e '.found == true' >/dev/null; then
        echo -e "\nFound matching transaction after $counter attempts!"
        echo "$result" | jq -r '.result'
        exit 0
    fi
done 