#!/usr/bin/env bash
# Sourced by every acceptance script that lets ket reach git. The host's
# configuration would otherwise sign the sandbox commits with its owner's key
# and run its owner's hooks over them, so the script would measure the machine
# instead of ket. Nulling both files leaves no identity behind either, and the
# committed path is the one under test, so the environment carries one.
export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_SYSTEM=/dev/null
export GIT_AUTHOR_NAME='ket acceptance'
export GIT_AUTHOR_EMAIL='acceptance@ket.invalid'
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
