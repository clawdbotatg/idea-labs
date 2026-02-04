//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { IdeaLabs } from "../contracts/IdeaLabs.sol";

contract DeployIdeaLabs is ScaffoldETHDeploy {
    // $CLAWD token on Base
    address constant CLAWD_TOKEN = 0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07;
    // Admin wallet
    address constant ADMIN = 0x11ce532845cE0eAcdA41f72FDc1C88c335981442;

    function run() external ScaffoldEthDeployerRunner {
        IdeaLabs ideaLabs = new IdeaLabs(CLAWD_TOKEN, ADMIN);
        console.logString(
            string.concat(
                "IdeaLabs deployed at: ",
                vm.toString(address(ideaLabs))
            )
        );
    }
}
