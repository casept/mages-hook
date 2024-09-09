/* Game-specific memory locations and other constants. */

// These are correct for Steins;Gate (Steam).

// The main VM dispatch function
// Signature: void __thiscall vm_instruction_dispatcher(void *this,SC3ThreadContext *thread_context)
const vm_instruction_dispatcher_addr = new NativePointer(0x004628f0);
export const vm_instruction_dispatcher = new NativeFunction(vm_instruction_dispatcher_addr, 'void', ['pointer', 'pointer']);

// The opcode pointer tables used by the VM dispatch function
export const vm_opcode_table_system = new NativePointer(0x00d30610);
export const vm_opcode_table_graphics = new NativePointer(0x00d2fff8);
export const vm_opcode_table_user1 = new NativePointer(0x00d31568);

// Useful VM helper functions
const vm_set_flag_addr = new NativePointer(0x00470930);
export const vm_set_flag = new NativeFunction(vm_set_flag_addr, 'void', ['uint32', 'uint32']);
const vm_get_flag_addr = new NativePointer(0x00470560);
export const vm_get_flag = new NativeFunction(vm_get_flag_addr, 'bool', ['uint32']);

/* End game-specific memory locations and other constants. */
