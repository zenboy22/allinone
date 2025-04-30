<p align="center"><img src="https://raw.githubusercontent.com/Viren070/AIOStreams/refs/heads/main/packages/frontend/public/assets/logo.png" /></p>
<h1 align="center" id="title">AIOStreams</h1>

## Description

AIOStreams consoloidates multiple Stremio addons and debrid services into a single, easily configurable addon. It allows highly customisable filtering, sorting, and formatting of results and supports proxying all your streams through [MediaFlow Proxy](https://github.com/mhdzumair/mediaflow-proxy) for improved compatibility and IP restriction bypassing.

## Key Features & Capabilities

- **Unified Addon Interface:** Aggregate results from various addons into a single, streamlined list.
- **Wide Addon Support:** Configure and integrate results from various addons. Even an addon that is not officially supported can be added by providing its URL as a custom addon.
- **Easy Configuration:** You can simply enable the services and addons you use, and AIOStreams will handle the rest.
- **Advanced Filtering:**
  - Filter results by resolution, quality, visual tags (e.g., HDR, DV), audio tags (e.g., Atmos, DTS), and video encodes.
  - Filter by keywords present in the stream title.
  - Specify minimum and maximum file sizes individually for episodes and movies.
  - Prioritise and/or exclude specific languages.
- **Sophisticated Sorting:** Sort aggregated results by quality, resolution, size, cached status, visual tags, audio tags, encodes, seeders (for torrents), service provider, language, or personal.
- **Duplicate Removal:** Intelligently removes duplicate results and prioritises specific services and addons for the same file based on your configuration.
- **Result Limiting:** Limit the number of results shown per resolution.
- **Customisable Result Formatting:**
  - Choose from predefined formats (e.g., `gdrive`, `minimalistic-gdrive`, `torrentio`, `torbox`).
  - Utilise a **Custom Formatter** system to define exactly how stream information is displayed. See the [Custom Formatter Wiki page](https://github.com/Viren070/AIOStreams/wiki/Custom-Formatter) for details.
  - View the formatters in the live preview at the configuration page.
- **MediaFlow Proxy Integration:** Proxy your streams through MediaFlow to allow for:
  - **IP Restriction Bypass**: Bypass simultaneous IP restrictions on some services
  - **Improved Compatibility**: Using MediaFlow Proxy improves compatibility with some apps and external players (like Infuse)

## Supported Addons

AIOStreams can parse and integrate results from the following addons:

- Torrentio
- MediaFusion
- Comet
- Torbox Addon
- Debridio
- Jackettio / Stremio-Jackett
- Peerflix
- DMM Cast
- Orion Stremio Addon
- Easynews
- Easynews++
- [Stremio GDrive](https://github.com/Viren070/stremio-gdrive-addon)
- Stremthru Store
- **Custom Addons:** Input any addon URL, and AIOStreams will attempt to parse its results.

> [!NOTE]
> Avoid installing the addons directly in Stremio if you have enabled them within AIOStreams to prevent redundant requests. Enabling too many addons simultaneously is also generally not recommended as they often scrape overlapping sources.

## Getting Started

To use AIOStreams, you need to host it yourself or use a hosted instance. Once running, access the `/configure` endpoint to set up your preferences, add API keys, select the addons you want to integrate, and install the configured AIOStreams addon into your Stremio application.

For detailed instructions on **Deployment**, **Configuration**, and **Development**, please refer to the project [**Wiki**](https://github.com/Viren070/AIOStreams/wiki):

- **[Deployment Guide](https://github.com/Viren070/AIOStreams/wiki/Deployment)** (Covers Docker, Cloudflare Workers, ElfHosted, Heroku, From Source, etc.)
- **[Configuration Guide](https://github.com/Viren070/AIOStreams/wiki/Configuration)** (Explains configuration options and Environment Variables)
- **[Development Guide](https://github.com/Viren070/AIOStreams/wiki/Development)** (Instructions for contributing or running in development mode)

## FAQ

- **How does it work?** AIOStreams fetches results from each enabled addon, parses the stream information, applies your configured filtering and sorting rules, formats the results, and presents them as a single Stremio addon.
- **Why was this created?** To provide a centralised way to manage multiple addons and debrid services with fine-grained control over filtering, sorting, and result presentation, which many individual addons lack.
- **What is Stremio?** If you're new to Stremio, check out my [Stremio guide](https://guides.viren070.me/stremio).

## Support the Project

AIOStreams is a free and open-source project maintained by me and its contributors. If you find it useful, you can support its development in the following ways:

- **Star the Repository**: Starring the repository helps others discover the project and shows your appreciation.
- **Star on Community Addon Sites**: If you use AIOStreams as an addon, consider starring it on the community [Stremio Addons](https://beta.stremio-addons.net/addons/aiostreams-elfhosted) site.
- **Contributions Welcome**: Issues, pull requests, and ideas for improvement are always appreciated.
- **Donations**: You can support the project financially by donating on [Ko-fi](https://ko-fi.com/viren070) or becoming a [GitHub Sponsor](https://github.com/sponsors/Viren070).

Your support, whether through a star, contribution, or donation, helps keep the project alive and growing. ❤️

## Disclaimer

AIOStreams and its developer do not host, store, or distribute any content. All content is sourced from the configured upstream addons. AIOStreams does not endorse or promote access to copyrighted content without authorisation. Users are responsible for ensuring they comply with all applicable laws and terms of service for the addons and content sources they use.

## Credits

- Thanks to [sleeyax/stremio-easynews-addon](https://github.com/Sleeyax/stremio-easynews-addon) for the repository structure and Dockerfile..
- Thanks to all the developers of the upstream addons that AIOStreams integrates.
- [MediaFlow](https://github.com/Mhdzumair/mediaflow-proxy) for the MediaFlow Proxy integration used in this addon.
- Issue templates adapted from [5rahim/seanime](https://github.com/5rahim/seanime).
- Custom formatter system inspired by and adapted from [diced/zipline](https://github.com/diced/zipline).
