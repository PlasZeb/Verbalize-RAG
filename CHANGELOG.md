# Changelog

## [1.3.0] - 2024-05-20
### Added
- **Voice Selection**: Users can now choose between 5 different AI personalities (Zephyr, Puck, Charon, Kore, Fenrir) in the header.
- **Jitter Buffer**: Improved audio playback stability by adding a 50ms safety buffer in the scheduling logic.
### Refined
- UI header now supports horizontal scrolling for mobile devices to accommodate all selectors.
- Connection footer status updated to reflect GitHub context synchronization.

## [1.2.2] - 2024-05-20
### Fixed
- **Session Restart Bug:** Fixed audio scheduling cursor reset issue.
- **Session Cleanup:** Implemented explicit session.close().

## [1.0.0] - 2024-05-20
- Initial release with Gemini Live API Integration.