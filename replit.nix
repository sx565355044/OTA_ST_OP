{pkgs}: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.nodePackages.typescript
    pkgs.yarn
    pkgs.mysql80
    pkgs.replitPackages.jest
  ];
}
