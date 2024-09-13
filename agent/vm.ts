import { vm_set_flag, vm_get_flag, vm_globals } from "./sg_steam.js";

const vmFlagWorkSize = 1000;

export function hookVMInstruction(opcode1stHalf: number, opcode2ndHalf: number, dispatchTable: NativePointer) {
	// Hook the VM instructions
	// Default hook - just print the opcode
	const instructionFuncPtr = dispatchTable.add(opcode2ndHalf * Process.pointerSize).readPointer();

	Interceptor.attach(instructionFuncPtr, {
		onEnter(args) {
			var ctx = new struct__SC3ThreadContext(args[0]);
			this.ctx = ctx;
			this.old_ip = ctx.layout.pc.readPointer();
			console.log(`[VM] ${opcode1stHalf}:${opcode2ndHalf}, Thread ID: ${ctx.layout.thread_id.readU32()}, IP: ${this.old_ip}, Script Buffer ID: ${ctx.layout.script_buffer_id.readU32()}`);
			monitorThreadContext(args[0]);
		},
		onLeave(retval) {
			const ip = this.ctx.layout.pc.readPointer();
			const delta = ip.sub(this.old_ip).toUInt32();
			// FIXME:
			const instrBytesHex = hexdump(this.old_ip, { length: delta, ansi: true, header: false });
			console.log(`[VM] IP before: ${this.old_ip}, IP after: ${ip}, IP delta: ${delta}`);
			console.log(`[VM] Instruction bytes consumed: ${instrBytesHex}`);
			MemoryAccessMonitor.disable();
		}
	});
}

function installGlobalsWatchpoint(address: NativePointer, size: number, condition: string, name: string) {
	// VM logic always runs on main thread
	const thread = Process.enumerateThreads()[0];

	Process.setExceptionHandler(e => {
		if (Process.getCurrentThreadId() === thread.id &&
			['breakpoint', 'single-step'].includes(e.type)) {
			console.log(`[VM] Global ${name} referenced by ${e.context.pc}, value ${address.readInt()} (watched condition: ${condition})`);
			const bt = Thread.backtrace(e.context, Backtracer.FUZZY);
			const bt_str =
				bt.map(DebugSymbol.fromAddress).join('\n');
			console.log(`[VM] Backtrace: ${bt_str}`);
			return true;
		}

		return false;
	});

	// FIXME: What does the 0 stand for?
	// @ts-ignore : Not yet in types package
	thread.setHardwareWatchpoint(0, address, size, condition);
}

export function watchVMGlobal(global: number, condition: string) {
	// FIXME: Wait until after engine initialization (and the heap allocation actually exists)
	const addr = vm_globals.readPointer().add(global * 4);
	installGlobalsWatchpoint(addr, 4, condition, global.toString());
}

export function getVMGlobal(global: number): number {
	const addr = vm_globals.readPointer().add(global * 4);
	const val = addr.readInt();
	console.log(`[VM] Global ${global} = ${val}`);
	return val;
}

var watchedFlags = new Set<number>();

Interceptor.attach(vm_set_flag, {
	onEnter: function(args) {
		const flagId = args[0].toUInt32();
		const newValue = args[1].toUInt32();
		if (watchedFlags.has(flagId)) {
			console.log(`[VM] Flag ${flagId} set to ${newValue}`);
		}
	},
});

Interceptor.attach(vm_get_flag, {
	onEnter(args) {
		this.flagId = args[0].toUInt32();
	},
	onLeave(result) {
		if (watchedFlags.has(this.flagId)) {
			console.log(`[VM] Flag ${this.flagId} read (value: ${result.toUInt32()})`);
		}
	}
});

export function watchVMFlag(flagId: number) {
	watchedFlags.add(flagId);
}

export function unwatchVMFlag(flagId: number) {
	watchedFlags.delete(flagId);
}

/* Structure of the SC3 VM thread context (from Steins;Gate, should be same in other games) */
export class struct__SC3ThreadContext {
	alignment: number;
	is_packed: boolean;
	base: NativePointer;
	total_size: number;
	layout: {
		accumulator: NativePointer,
		gap4: NativePointer,
		thread_group_id: NativePointer,
		sleep_timeout: NativePointer,
		gap28: NativePointer,
		loop_counter: NativePointer,
		loop_target_label_id: NativePointer,
		call_stack_depth: NativePointer,
		ret_address_ids: NativePointer,
		ret_address_script_buffer_ids: NativePointer,
		thread_id: NativePointer,
		script_buffer_id: NativePointer,
		gap120: NativePointer,
		thread_local_variables: NativePointer,
		somePageNumber: NativePointer,
		next_context: NativePointer,
		prev_context: NativePointer,
		next_free_context: NativePointer,
		pc: NativePointer
	};

	offsets: {
		accumulator: number,
		gap4: number,
		thread_group_id: number,
		sleep_timeout: number,
		gap28: number,
		loop_counter: number,
		loop_target_label_id: number,
		call_stack_depth: number,
		ret_address_ids: number,
		ret_address_script_buffer_ids: number,
		thread_id: number,
		script_buffer_id: number,
		gap120: number,
		thread_local_variables: number,
		somePageNumber: number,
		next_context: number,
		prev_context: number,
		next_free_context: number
		pc: number
	};

	constructor(baseaddr: NativePointer) {
		this.alignment = 4
		this.is_packed = true
		this.base = baseaddr
		this.total_size = 336
		this.layout = {
			accumulator: this.base.add(0),   //int, size:4 - Signed Integer (compiler-specific size)
			gap4: this.base.add(4),   //char[16], size:16 - Array of Character
			thread_group_id: this.base.add(20),   //uint, size:4 - Unsigned Integer (compiler-specific size)
			sleep_timeout: this.base.add(24),   //uint, size:4 - Unsigned Integer (compiler-specific size)
			gap28: this.base.add(28),   //char[8], size:8 - Array of Character
			loop_counter: this.base.add(36),   //uint, size:4 - Unsigned Integer (compiler-specific size)
			loop_target_label_id: this.base.add(40),   //uint, size:4 - Unsigned Integer (compiler-specific size)
			call_stack_depth: this.base.add(44),   //uint, size:4 - Unsigned Integer (compiler-specific size)
			ret_address_ids: this.base.add(48),   //uint[8], size:32 - Array of Unsigned Integer (compiler-specific size)
			ret_address_script_buffer_ids: this.base.add(80),   //uint[8], size:32 - Array of Unsigned Integer (compiler-specific size)
			thread_id: this.base.add(112),   //int, size:4 - Signed Integer (compiler-specific size)
			script_buffer_id: this.base.add(116),   //int, size:4 - Signed Integer (compiler-specific size)
			gap120: this.base.add(120),   //char[68], size:68 - Array of Character
			thread_local_variables: this.base.add(188),   //int[32], size:128 - Array of Signed Integer (compiler-specific size)
			somePageNumber: this.base.add(316),   //int, size:4 - Signed Integer (compiler-specific size)
			next_context: this.base.add(320),   //SC3ThreadContext *, size:4 - pointer to SC3ThreadContext
			prev_context: this.base.add(324),   //SC3ThreadContext *, size:4 - pointer to SC3ThreadContext
			next_free_context: this.base.add(328),   //SC3ThreadContext *, size:4 - pointer to SC3ThreadContext
			pc: this.base.add(332)   //void *, size:4 - pointer to void
		}
		this.offsets = {
			accumulator: 0,   //int, size:4
			gap4: 4,   //char[16], size:16
			thread_group_id: 20,   //uint, size:4
			sleep_timeout: 24,   //uint, size:4
			gap28: 28,   //char[8], size:8
			loop_counter: 36,   //uint, size:4
			loop_target_label_id: 40,   //uint, size:4
			call_stack_depth: 44,   //uint, size:4
			ret_address_ids: 48,   //uint[8], size:32
			ret_address_script_buffer_ids: 80,   //uint[8], size:32
			thread_id: 112,   //int, size:4
			script_buffer_id: 116,   //int, size:4
			gap120: 120,   //char[68], size:68
			thread_local_variables: 188,   //int[32], size:128
			somePageNumber: 316,   //int, size:4
			next_context: 320,   //SC3ThreadContext *, size:4
			prev_context: 324,   //SC3ThreadContext *, size:4
			next_free_context: 328,   //SC3ThreadContext *, size:4
			pc: 332   //void *, size:4
		}
	}
}

function monitorThreadContext(ctxPtr: NativePointer) {
	const ctx = new struct__SC3ThreadContext(ctxPtr);
	console.log(`[VM] Thread ID: ${ctx.layout.thread_id.readU32()}, IP: ${ctx.layout.pc.readPointer()}, Script Buffer ID: ${ctx.layout.script_buffer_id.readU32()}`);
	const range: MemoryAccessRange = {
		base: ctxPtr,
		size: ctx.total_size,
	};
	const cb: MemoryAccessCallbacks = {
		onAccess: function(access: MemoryAccessDetails) {
			onThreadCtxAccessCB(ctxPtr, access);
		}
	};
	MemoryAccessMonitor.enable(range, cb);
}

function onThreadCtxAccessCB(ctx: NativePointer, access: MemoryAccessDetails) {
	// Figure out which field was accessed
	const ctxStruct = new struct__SC3ThreadContext(ctx);
	for (const [name, offset] of Object.entries(ctxStruct.offsets)) {
		if (access.address.equals(ctx.add(offset))) {
			console.log(`[VM] Instruction accesses ctx field ${name}`);
			break;
		}
	}

	// TODO: Re-create access monitor, as only the first access to a page is monitored
}
