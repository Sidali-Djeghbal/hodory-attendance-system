# Student Attendance Frontend

This frontend corresponds to the **Student Attendance System**, a multi-role platform designed for managing and tracking student attendance with dedicated interfaces for Administrators, Teachers, and Students.  
It is implemented following a structured software-engineering workflow, ensuring that every screen, interaction, and feature aligns with the system’s documented requirements and behaviors.

The complete project documentation report — including functional and non-functional requirements, role definitions, detailed textual use-case specifications, system diagrams..ect — is available here:  
**https://sidali-djeghbal.github.io/software-engineering/**

<p align="center">
  <img src="./assets/icons/adminApp.svg" width="45%" />
  <img src="./assets/icons/studentApp.svg" width="45%" /> 
</p>


## Figma Design
[View Figma Design](https://www.figma.com/design/9tbInW4olc881fA9xrHBhL/student-attn?node-id=141-229&p=f&t=an5RcrJqGB74iNFv-0)


## Project Structure

This project is built with [Expo](https://expo.dev).

- **app/**: Contains the main application screens and layout files. This directory follows file-based routing.
  - `_layout.tsx`: Defines the global layout and navigation structure.
  - `index.tsx`: The entry point/home screen of the application.
- **assets/**: Stores static assets such as images and fonts.
- **components/**: Reusable UI components used throughout the application.
- **styles/**: Contains global styling and theme definitions.
- **utils/**: Utility functions and helpers.
  - `assets.ts`: Centralizes image imports.
    - **Benefit**: Simplifies imports by avoiding long relative paths (e.g., `../../assets/img/image.png`). Instead, you can reference assets cleanly (e.g., `import { student } from '@/utils/assets'`). It also allows for easier management and updating of assets from a single location.

## Get started

1. Install dependencies

   ```bash
   bun install
   ```

2. Start the app

   ```bash
   bun start
   ```


## Useful Development Links

- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Vector Icons](https://icons.expo.fyi/)
- [Expo Linear Gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/)
- [Expo Image](https://docs.expo.dev/versions/latest/sdk/image/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
