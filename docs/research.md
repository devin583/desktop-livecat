# Desktop Pet Research Notes

## Reference projects

- VPet-Simulator: Windows-first C# / WPF desktop pet with rich interaction, Steam ecosystem, and plugin direction. Best reference for product depth, not for cross-platform architecture.
- desktopPet/eSheep: tiny portable Windows pet using simple animation definitions. Best reference for green distribution and resource portability.
- Shimeji and Shijima-Qt: best references for behavior/action vocabulary such as fall, dragged, thrown, chase mouse, and window edge awareness.
- BANDORI-PET-REV: useful reference for Live2D, AI/TTS, tray, and Windows transparency handling; not suitable as a base because of Python stack weight, model size, GPLv3, and IP asset constraints.
- QPet/Desktop Shimeji Pet: commercial reference for user expectations around cute motion, MMD/3D import, multi-screen behavior, and performance settings.

## Product conclusions

- Do not clone or fork existing pets. Use them to define interaction vocabulary and failure cases.
- Win11 users should get a zip they can unzip and run. Setup packages are optional, not the default path.
- The pet must remain useful offline. Online AI/TTS is an optional module, not a core dependency.
- Cute motion quality matters more than early feature count. Breathing, blinking, paws, ears, tail, and body weight shifts all need independent timing.
