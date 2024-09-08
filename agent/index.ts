import { hookVMInstruction } from "./vm.js";
import { vm_opcode_table_user1 } from "./sg_steam.js";

var cont = false;

function main() {
    hookVMInstruction(0x10, 0x34, vm_opcode_table_user1);
}

main()
