import { hookVMInstruction, watchVMFlag } from "./vm.js";
import { vm_opcode_table_user1, vm_opcode_table_system } from "./sg_steam.js";

function main() {
  // hookVMInstruction(0x10, 0x34, vm_opcode_table_user1);
  watchVMFlag(1605);
}

main()
