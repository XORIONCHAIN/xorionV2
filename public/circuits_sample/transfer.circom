pragma circom 2.0.0;

include "external/circuits/poseidon.circom";
include "external/merkleTree.circom";

template Transfer(levels) {
    signal input root;
    signal input nullifier1;
    signal input nullifier2;
    signal input commitment1;
    signal input commitment2;
    signal input note1_amount;
    signal input note1_blinding;
    signal input note2_amount;
    signal input note2_blinding;
    signal input out1_amount;
    signal input out1_blinding;
    signal input out2_amount;
    signal input out2_blinding;
    signal input pathElements1[levels];
    signal input pathIndices1[levels];
    signal input pathElements2[levels];
    signal input pathIndices2[levels];

    // Verify nullifiers
    component poseidonNull1 = Poseidon(1);
    poseidonNull1.inputs[0] <== note1_blinding;
    nullifier1 === poseidonNull1.out;

    component poseidonNull2 = Poseidon(1);
    poseidonNull2.inputs[0] <== note2_blinding;
    nullifier2 === poseidonNull2.out;

    // Verify new commitments
    component poseidonCommit1 = Poseidon(2);
    poseidonCommit1.inputs[0] <== out1_amount;
    poseidonCommit1.inputs[1] <== out1_blinding;
    commitment1 === poseidonCommit1.out;

    component poseidonCommit2 = Poseidon(2);
    poseidonCommit2.inputs[0] <== out2_amount;
    poseidonCommit2.inputs[1] <== out2_blinding;
    commitment2 === poseidonCommit2.out;

    // Balance preservation
    note1_amount + note2_amount === out1_amount + out2_amount;

    // Merkle proof for note1
    component poseidonLeaf1 = Poseidon(2);
    poseidonLeaf1.inputs[0] <== note1_amount;
    poseidonLeaf1.inputs[1] <== note1_blinding;

    component merkleProof1 = MerkleTreeChecker(levels);
    merkleProof1.leaf <== poseidonLeaf1.out;
    merkleProof1.root <== root;
    for (var i = 0; i < levels; i++) {
        merkleProof1.pathElements[i] <== pathElements1[i];
        merkleProof1.pathIndices[i] <== pathIndices1[i];
    }

    // Merkle proof for note2
    component poseidonLeaf2 = Poseidon(2);
    poseidonLeaf2.inputs[0] <== note2_amount;
    poseidonLeaf2.inputs[1] <== note2_blinding;

    component merkleProof2 = MerkleTreeChecker(levels);
    merkleProof2.leaf <== poseidonLeaf2.out;
    merkleProof2.root <== root;
    for (var i = 0; i < levels; i++) {
        merkleProof2.pathElements[i] <== pathElements2[i];
        merkleProof2.pathIndices[i] <== pathIndices2[i];
    }
}

component main = Transfer(20);