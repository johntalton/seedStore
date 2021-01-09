# Seed Store

An attempt at providing a simple example of loaing and rendering from JSON configuration in p5.

- module style (but not typescript due to target requirments)
- query parameter seed loaing
- JSON kvp and configuation
- ascyn walk calcuation
- seedable random for the web (`Math.random` is a no go)
- in render status messaging and pre-load p5 splach screen
- walk calc reimplimented from reference for similarity (note about `random` stability across implementations)

This is inspiered by the work over at [Coding Traing : Random Whistle](https://github.com/CodingTrain/Random-Whistle)


## Future Items
- cache walk (in mem and/or in JSON for default depth)
- update query params without relaod
    - (add dropdown to select from known keys)
- render walk with animation 
    - (render entire walk as transparent, then animate in the path over time)
    - (impliment timing abstraction for walk render
- capture canvase as base64 blob and store in `localStorage` or `fileStorage`
- split render logic from Walk logic from game state messageing logic
    - (all keep togeth now to aid in target requiremnts)
