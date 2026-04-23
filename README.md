# Mi Casa 🏠

![Game Screenshot](https://github.com/applescan/mi-casa/blob/main/public/assets/home.png)

Welcome to **Mi Casa**! A fun, interactive virtual tour of my house where you can explore different rooms and get to know a little bit about me. Along the way, you'll encounter mini-games like rock-paper-scissors, with more exciting games coming soon! Whether you're here for the exploration or the gameplay, there's something for everyone in **Mi Casa**.

## Features

- **Explore a virtual house**: Roam through different rooms and discover details about the house and its surroundings.
- **Mini-games**: Enjoy quick mini-games like rock-paper-scissors, bubble pop, roach catch, remote hunt, laundry sort, dust bunny chase, recipe rush, and water the plants.
- **Interactive dialogue**: Trigger dialogues with various characters to learn more about the house and its world.
- **Dynamic player movement**: Smooth and responsive movement system, allowing the player to move freely within the environment using both mouse and keyboard controls.
- **Responsive camera**: The camera follows the player as they explore, offering a seamless and immersive experience.

## Technologies Used

**Mi Casa** is built with the following technologies:

- **Kaboom.js**: A simple and powerful 2D game framework for JavaScript/Typescript that enables us to create fast-paced, interactive gameplay. Kaboom.js is used for rendering the game world, managing player interactions, and controlling the game's logic and animations.
  
- **React**: React is used to handle the user interface (UI) for game elements like the dialogue box, which appears when interacting with characters. React ensures smooth, component-based updates and a dynamic experience throughout the game.

- **Canvas API**: The game’s environment and character animations are rendered using the HTML5 Canvas API, which gives us the flexibility to design and control everything down to the pixel level.

- **TypeScript**: TypeScript is used to ensure strong typing and better development experience with IDE support, error checking, and cleaner code for the game’s mechanics.

- **Custom Animations & Sprite Sheets**: The game’s characters and actions are animated using sprite sheets, allowing for smooth, frame-based animation for walking and idle states.

- **Game Logic**: Custom game logic is written using JavaScript to handle interactions, player movement, collision detection, and dialogue management.

## Installation

To run **Mi Casa** locally, follow these steps:

1. **Clone the repository**:
    ```bash
    git clone https://github.com/applescan/mi-casa.git
    ```

2. **Navigate to the project directory**:
    ```bash
    cd mi-casa
    ```

3. **Install the dependencies**:
    If you haven't installed dependencies yet, use npm to install them:
    ```bash
    npm install
    ```

4. **Add your database URL**:
    Create a `.env` file and set `DATABASE_URL` to your Neon/Postgres connection string:
    ```bash
    DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
    ```

5. **Run the development server**:
    ```bash
    npm run dev
    ```

6. **Play the game**:
    Open your browser and go to `http://localhost:5173` to start playing the game!

## How to Play

- **Explore**: Click to move the player around the house and interact with various objects.
- **Dialogue**: Trigger dialogue boxes by colliding with interactive boundaries or characters in the game.
- **Mini-games**: Engage in mini-games like rock-paper-scissors.
- **Movement**: Move the player using your mouse or the arrow keys for a smooth, dynamic exploration experience.

## Roadmap

Future updates for **Mi Casa** include:

- **More mini-games**: Additional mini-games will be added to provide even more fun and challenges.
- **New rooms and areas**: Explore new rooms in the house with different environments and interactions.
- **Interactive features**: More interactive objects and dynamic gameplay features.

## Contributing

I welcome contributions! If you want to help improve the game, feel free to fork the repository and submit pull requests. Here are a few ways you can contribute:

- **Bug Fixes**: Report bugs and help resolve them.
- **Features**: Add new gameplay features and mini-games.
- **Art Assets**: Contribute new character designs, environments, or animations.
- **Localization**: Help translate the game into different languages.

## Credits

This game includes assets from the following sources:

- **Interior Tilesets**:
  - [Pixel Lands Interiors](https://trislin.itch.io/pixel-lands-interiors)
  - [Top-Down Retro Interior](https://penzilla.itch.io/top-down-retro-interior)
  - [Interior Tileset (16x16)](https://opengameart.org/content/interior-tileset-16x16)
  
- **Character Pack**:
  - [Retro RPG Character Pack](https://the-pixel-nook.itch.io/retro-rpg-character-pack)

Thank you to these creators for providing their assets to help bring **Mi Casa** to life!

## License

This project is licensed under the MIT License.

---

Enjoy exploring **Mi Casa**! Stay tuned for future updates and new content. Have fun and happy exploring!
