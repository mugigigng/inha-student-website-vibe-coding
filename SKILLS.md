# React Three Fiber Skill

## Purpose
Use React Three Fiber (R3F) and Drei to create interactive,
performant 3D experiences in React applications.

## Libraries
- three
- @react-three/fiber
- @react-three/drei

## Rules

### Architecture
- Keep 3D components separate from normal UI components.
- Put reusable 3D components in `src/components/3d/`.
- Use `<Canvas>` as the root of each 3D scene.
- Prefer Drei helpers over manually implementing common Three.js utilities.

### Performance
- Avoid unnecessary re-renders.
- Reuse geometries and materials when possible.
- Avoid creating objects inside the render loop.
- Use `useFrame` only when animation requires per-frame updates.
- Keep complex 3D scenes lightweight.

### Interaction
- Use pointer events provided by R3F.
- Add hover and click interactions where appropriate.
- Provide fallback behavior for devices that may have limited GPU performance.

### Styling
- Follow the project's existing design system.
- 3D elements should support the UI rather than overwhelm it.
- Use subtle animation and lighting unless the design specifically requires otherwise.

### Code Quality
- Prefer functional React components.
- Keep scene logic modular.
- Use Drei components such as:
  - OrbitControls
  - Environment
  - Float
  - Html
  - Text
  - ContactShadows

## Claude Implementation Rules

When adding 3D to a React page:

1. Inspect the existing project structure and design system first.

2. Determine whether 3D actually improves the user experience.
   Do not add 3D only for decoration.

3. Keep 3D scene components separate from regular UI components.

4. Create the scene using `<Canvas>`.

5. Prefer Drei utilities when they provide the required functionality.

6. Keep geometry, materials, lights, and scene logic reusable.

7. Avoid unnecessary `useFrame` calls and per-frame calculations.

8. Avoid creating new Three.js objects during every render.

9. Optimize models, textures, lights, shadows, and post-processing
   according to the visual importance of the scene.

10. Make pointer interactions intentional and accessible.

11. Ensure the UI remains usable if the 3D scene is hidden,
    disabled, or unavailable.

12. Test the experience on both desktop and mobile.

13. Respect the existing design system. 3D should reinforce the
    interface rather than compete with its content.

14. Remove unnecessary 3D effects if they reduce performance,
    readability, or usability.