{pkgs}: {
  deps = [
    pkgs.wabt
    pkgs.binaryen
    pkgs.openssl
    pkgs.pkg-config
  ];
}
