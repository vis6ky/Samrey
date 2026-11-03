# Table 8: Measured Empirical Benchmarks & Performance Results

| Performance Dimension | Benchmark Description | Iterations & Sampling | Average Execution Time | Ops / Second | Threshold Invariant | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Compiler** | Small Template (~10 nodes) | 25 (trimmed) | **0.075 ms** | 13,333 | $< 0.100\text{ ms}$ | ✅ PASSED |
| **Compiler** | Medium Template (~100 nodes) | 25 (trimmed) | **0.916 ms** | 1,091 | $< 1.300\text{ ms}$ | ✅ PASSED |
| **Compiler** | Large Template (~1,000 nodes) | 15 (trimmed) | **2.651 ms** | 377 | $< 3.700\text{ ms}$ | ✅ PASSED |
| **Compiler** | Deeply Nested (150 levels) | 20 (trimmed) | **0.381 ms** | 2,624 | $< 0.550\text{ ms}$ | ✅ PASSED |
| **Reactivity** | 10,000 Sequential Signal Mutations | 15 (trimmed) | **8.557 ms** | 116 | $< 12.00\text{ ms}$ | ✅ PASSED |
| **Reactivity** | 100 Independent Signals with Effects | 25 (trimmed) | **0.604 ms** | 1,655 | $< 0.850\text{ ms}$ | ✅ PASSED |
| **Reactivity** | Batched Updates (1,000 signals in 1 batch) | 20 (trimmed) | **3.156 ms** | 316 | $< 4.500\text{ ms}$ | ✅ PASSED |
| **Runtime DOM** | Initial Mount (100 nodes via clone) | 25 (trimmed) | **0.323 ms** | 3,095 | $< 0.450\text{ ms}$ | ✅ PASSED |
| **Runtime DOM** | Initial Mount (1,000 nodes) | 20 (trimmed) | **1.035 ms** | 966 | $< 1.500\text{ ms}$ | ✅ PASSED |
| **Runtime DOM** | Attribute Updates (1,000 elements) | 20 (trimmed) | **3.892 ms** | 256 | $< 5.500\text{ ms}$ | ✅ PASSED |
| **Control Flow** | Show Transition (false -> true) | 25 (trimmed) | **0.028 ms** | 35,714 | $< 0.040\text{ ms}$ | ✅ PASSED |
| **Control Flow** | For List Initial Keyed Mount (1,000 items) | 15 (trimmed) | **5.628 ms** | 177 | $< 8.000\text{ ms}$ | ✅ PASSED |
| **Control Flow** | For List 90% Node Reuse Verification | 15 (trimmed) | **6.166 ms** | 162 | $\ge 90\%\text{ reuse}$ | ✅ PASSED |
| **SSR** | SSR `renderToString` (1,000 nodes) | 25 (trimmed) | **0.193 ms** | 5,181 | $< 0.260\text{ ms}$ | ✅ PASSED |
| **SSR** | SSR `renderToStream` (1,000 nodes complete) | 20 (trimmed) | **1.940 ms** | 515 | $< 2.700\text{ ms}$ | ✅ PASSED |
| **SSR** | Payload Secret Scrubbing (500 items deep scan) | 20 (trimmed) | **1.033 ms** | 968 | $< 1.450\text{ ms}$ | ✅ PASSED |

*Hardware Environment: Linux x64, 2-core virtualized container, 4.00 GB RAM, Node.js v22.23.1. Full data recorded in `docs/PERFORMANCE.md`.*
