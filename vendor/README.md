# Pinned BoxedWine browser engine

The five `boxedwine-runtime.tar.gz.part-*` segments join into one gzip archive containing the six unchanged open-source engine assets
listed in `oblivion-runtime-manifest.json`. It contains no Wine system image,
Windows game files, Steam client or account data. It keeps fresh GitHub and
Cloudflare builds independent of the upstream temporary demo download URL.

BoxedWine is GPL-2.0-or-later. The retained license is
`public/oblivion/LICENSE-BoxedWine.txt`; component notices and build references
are recorded in `public/open-source/oblivion-notice.txt`.

Exact corresponding source and build instructions:
https://github.com/danoon2/Boxedwine/tree/bf83173605148c73780069e9afa452cc05cb7191

Complete corresponding source archive:
https://codeload.github.com/danoon2/Boxedwine/tar.gz/bf83173605148c73780069e9afa452cc05cb7191

Source SHA-256: `f24eab342a05433785018af60238a4914373195d0a26f3f799dc6f288260775a`.
The build also serves that full source archive beside the deployed engine at
`/runtimes/sources/boxedwine-source.tar.gz`.

Both the compressed archive and every extracted file are independently checked
against their pinned SHA-256 and length before a build uses them.
