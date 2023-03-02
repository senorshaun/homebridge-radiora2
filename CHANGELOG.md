# Changelog
All notable changes to this project should be documented in this file

## [1.7.0] - 2023-03-02
### Added
 - Temperature Sensors (report battery and active state and averaged thermostat temp)
### Fixed
 - Fixed the moving state for Window Coverings
 - Fixed issue in which pico buttons were not correctly triggering in Homekit
 - Cleaned up debug logging output, seperating the raw lutron logs to a seperate switch
 - Code cleanup


## [1.6.0] - 2023-02-17
### Added
 - Window Covering (shades and blinds)

## [1.5.4] - 2022-12-08
### Added
 - Debug logging option to view all interactions
### Fixed
 - Undefined variable in stateless keypad buttons 

## [1.5.2] - 2022-11-17
### Added
 - This CHANGELOG
### Fixed
 - Fixed `homebridge-ui` auto detection of lights
 - Updated README
 - Added placeholders to some of the `homebridge-ui` fields

 ## [1.5.1] - 2022-11-15
 ### Added
 - Added `homebridge-ui` support with auto detection
 - Added support for Pico remotes
 ### Fixed
 - Fixed issue with keypads not update due to incorrect uuid generation/callback
