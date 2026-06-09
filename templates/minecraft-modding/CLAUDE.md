# CLAUDE.md — Minecraft Forge mod (1.20.1) starter

This is a starter brain for a Claude Code teammate working on a **Minecraft 1.20.1 / Forge** mod.
Drop it in your project root, fill in the project-specific section at the bottom, and pair it with
**Forge** (the operating discipline in `FORGE.md`). The rules below are the ones that bite *after*
a build — they prevent runtime crashes that don't show up until the Forge `reobfJar` step runs.

---

## Crash-safety rules — always apply, every time you write code

These prevent runtime `NoClassDefFoundError` / crashes that only appear AFTER reobfuscation.
They are not style preferences — they are correctness rules. Non-negotiable.

### Never use `switch` on an enum
`switch`-on-enum emits a hidden synthetic `$SwitchMap` class that does not survive `reobfJar` →
`NoClassDefFoundError` at runtime. Use `if` / `else if` with `==`:
```java
// WRONG — crashes at runtime after reobf
switch (facing) { case DOWN -> ...; }
// CORRECT
if      (facing == Direction.DOWN)  pose.mulPose(Axis.XP.rotationDegrees(180));
else if (facing == Direction.NORTH) pose.mulPose(Axis.XP.rotationDegrees(270));
```

### Never use anonymous classes — anywhere
Anonymous classes (`new SomeInterface() { ... }`) compile to synthetic `$1`, `$2` … that don't
survive `reobfJar` → `NoClassDefFoundError`. Applies to EVERYTHING — capability wrappers
(`IFluidHandler`, `IEnergyStorage`, `IItemHandler`), comparators, callbacks. Use a named `static`
inner class, and instantiate capability handlers **eagerly** (interface-typed field before the
`LazyOptional`):
```java
private static final class MyEnergy implements IEnergyStorage { ... }
private final IEnergyStorage energyObj = new MyEnergy(this);
private final LazyOptional<IEnergyStorage> energyCap = LazyOptional.of(() -> energyObj);
```
For `MenuProvider`, use `SimpleMenuProvider` rather than an anonymous one.

### Non-full-cube blocks must declare no occlusion
Any block whose model doesn't fill the full 1×1×1 must override both, or adjacent blocks render
see-through:
```java
@Override public VoxelShape getOcclusionShape(...) { return Shapes.empty(); }
@Override public boolean useShapeForLightOcclusion(...) { return false; }
```

### Block drops need tool context
In 1.20.1, `Block.getDrops()` with no tool makes pickaxe-required blocks drop nothing. Use a
`LootParams.Builder` with `LootContextParams.TOOL` set to an appropriate tool (e.g. a diamond
pickaxe) when you need a block to drop programmatically.

### BlockState serialization — `NbtUtils` write + a manual reader
Write with `NbtUtils.writeBlockState(state)`. Do NOT use
`NbtUtils.readBlockState(BuiltInRegistries.BLOCK, tag)` — in Forge 1.20.1 `DefaultedRegistry<Block>`
doesn't implement `HolderGetter<Block>` and won't compile. Write a small manual reader that resolves
the block by ResourceLocation and re-applies the stored properties.

### Blockbench UV normalization — divide by 16
Blockbench exports UVs in model-unit space (0–16). Normalize by dividing every UV by **16** — NOT
the PNG pixel size, NOT `texture_size`. Correct for any PNG size.

---

## Workflow discipline

- **Build after every change.** Run your build (`./gradlew build`) and fix all errors before
  calling anything done. Reobfuscation errors only appear at build time — "it compiles in the IDE"
  is not "it builds."
- **Port from a reference, don't invent.** If you're recreating behavior from another mod or an
  older version, open the real source and port it. If you can't find the equivalent, say so — don't
  guess at an API you haven't confirmed exists (Forge/Minecraft APIs are the #1 hallucination trap).
- **Stay in scope.** Fix the thing you were asked to fix. If it drags you into another system, stop
  and surface it — don't silently "improve" unrelated code.
- **Everything registers through `DeferredRegister`.** Blocks, items, block entities, menus — all
  via deferred registers, wired in your mod's setup classes.

---

## Project-specific (fill this in)

> Replace this section with YOUR mod's details:
> - What the mod is, the modid, the target MC/Forge versions.
> - Where the source, assets, and recipes live.
> - Your registry classes and how they're organized.
> - Any project rules or design decisions a teammate must not reverse.
