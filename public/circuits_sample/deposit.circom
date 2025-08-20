pragma circom 2.0.0;

include "circuits/poseidon.circom";

template Deposit() {
    signal input amount;
    signal input blinding;
    signal output commitment;

    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== amount;
    poseidon.inputs[1] <== blinding;
    commitment <== poseidon.out;
}

component main = Deposit();