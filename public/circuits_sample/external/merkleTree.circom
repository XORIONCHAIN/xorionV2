pragma circom 2.0.0;

include "circuits/poseidon.circom";
include "circuits/mux1.circom";

template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component hashers[levels];
    component muxLeft[levels];
    component muxRight[levels];
    signal computedRoot;

    var current = leaf;
    for (var i = 0; i < levels; i++) {
        // Initialize Poseidon hasher
        hashers[i] = Poseidon(2);
        
        // Mux for left input
        muxLeft[i] = Mux1();
        muxLeft[i].c[0] <== current;         // If pathIndices[i] == 0, current is left
        muxLeft[i].c[1] <== pathElements[i]; // If pathIndices[i] == 1, pathElements[i] is left
        muxLeft[i].s <== pathIndices[i];

        // Mux for right input
        muxRight[i] = Mux1();
        muxRight[i].c[0] <== pathElements[i]; // If pathIndices[i] == 0, pathElements[i] is right
        muxRight[i].c[1] <== current;         // If pathIndices[i] == 1, current is right
        muxRight[i].s <== pathIndices[i];

        // Assign inputs to hasher
        hashers[i].inputs[0] <== muxLeft[i].out;
        hashers[i].inputs[1] <== muxRight[i].out;

        current = hashers[i].out;
    }

    computedRoot <== current;
    root === computedRoot;
}