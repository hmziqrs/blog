

Background:
So my MacBook M3 Max with 2 terabyte hard drive and 128 GB RAM was lagging just imagine a top of the hard MacBook and maximum amount of performance is lagging on charging make it make sense
The reason was not simple. My RAM usage is a pro high as I work on Rust projects and I work on two three projects at once. So generally 60 GB of RAM is fine, but I was working on multiple Rust projects and it took more than 128 GB of memory required, and I was also using 60 GB of SWAP. So when I look at my storage it was 1.4 TB full
So the thing is Rust projects are not very kind to your SSDs.
The solution was simple. I had purchased some VPS previous year. They are very good dedicated VPS with dedicated resources. So I'm like why not use them as caching and my main runner environment and just use my laptop as a coder.

Things I did on my vps:
Create a new user on the VPS and give it sudo privileges.
Disable password login via ssh and set up key based only.
Setup ssh sessions to stay alive for long.
no root login via ssh, only user login.
change default ssh port.
setup fail2ban to prevent brute force attacks.
Install claude, claude-multi, opencode, bun, git and other necessary tools on the VPS.
Setup tmux and configured it to for per multi-slot per project.

```
Hardening a Fresh Debian VPS for Development
I started with a clean Debian 13 box and wanted it set up to (a) stop dropping my SSH session, (b) push signed commits to GitHub without friction, and (c) compile Rust projects fast without filling the disk. Here's what I did and why.

1. Killing SSH idle drops
The single most annoying thing about working on a remote box: you walk away for coffee, come back, and your terminal is frozen. The connection didn't crash — a NAT table or firewall simply forgot about the silent TCP stream and dropped it. The fix is keepalives: small packets that say "I'm still here" often enough to keep the idle timer from expiring.

I applied it on both ends, because either side can independently keep the connection warm.

Server side — /etc/ssh/sshd_config.d/00-custom.conf:


ini
Port 2222
PermitRootLogin no

# keep connections alive
ClientAliveInterval 60
ClientAliveCountMax 3

# brute-force resistance
MaxAuthTries 3
LoginGraceTime 30
MaxStartups 10:30:20

# attack surface reduction
AllowUsers axent
X11Forwarding no
The important lines for drops are ClientAliveInterval 60 (server pings the client every 60s) and ClientAliveCountMax 3 (gives up after 3 missed). Everything else is general hardening: a non-standard port to dodge drive-by scanners, no root login, a strict auth-tries cap, and a login whitelist so only my user can even attempt to connect.

Client side — ~/.ssh/config:


text
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    TCPKeepAlive yes
The client-side ServerAliveInterval is the higher-value fix — it works even when you don't control the server, and it works against the NAT/firewall on your local network, which is usually where the drop actually originates.

One gotcha worth mentioning: systemctl reload sshd reloads the config without dropping existing sessions, so you can apply changes without locking yourself out. Always run sshd -t first to validate syntax.

2. GitHub identity: SSH + signed commits
For git I set the obvious globals:


bash
git config --global user.name "hmziqagent"
git config --global user.email "hmziqagent@gmail.com"
Then an ed25519 SSH key dedicated to GitHub:


bash
ssh-keygen -t ed25519 -C "hmziqagent@gmail.com" -f ~/.ssh/id_ed25519_github -N ""
ed25519 over RSA because it's smaller, faster, and the modern default GitHub recommends. I wired it into ~/.ssh/config so the right key is always offered:


text
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_github
    IdentitiesOnly yes
For commit signing I generated an ed25519 GPG key and turned on signing globally:


bash
git config --global user.signingkey B49EC5B23AE1DEC3
git config --global commit.gpgsign true
Now every commit shows a green Verified badge on GitHub automatically — no per-commit --gpg-sign flag needed. I verified it end-to-end with a test commit that produced gpg: Good signature.

The public halves of both keys get pasted into GitHub → Settings → SSH and GPG keys.

3. A global Rust build cache
Rust's biggest pain point on a small VPS: every project drops a target/ directory full of build artifacts, and they stack up fast — gigabytes before you notice. I wanted zero per-project config, so I went with a single global setup.

Three pieces:

kache — a rustc-wrapper that caches compiler output. Rebuild the same crate anywhere, it's a cache hit.
cargo-sweep — removes build artifacts older than N days from a project.
A global target dir — every project writes to one shared ~/.cache/cargo-target instead of polluting the repo.
Wired into ~/.cargo/config.toml:


toml
[build]
target-dir = "/home/axent/.cache/cargo-target"
rustc-wrapper = "/home/axent/.cargo/bin/kache"

[profile.dev]
incremental = false

[profile.release]
incremental = false
Then a weekly cron job (Sunday 03:00) runs cargo-sweep --time 21 across every project under $HOME and garbage-collects the kache cache. The cleanup script prints before/after sizes so I can see it working.

I tested the whole pipeline by building a project that depends on the syn crate: artifacts landed in the global target dir (no ./target in the project), the kache cache grew by ~19M, and the cleanup script ran clean.

The tradeoff worth being honest about: because every project shares one target dir, switching between projects with different dependency versions occasionally forces a rebuild. kache softens this by caching the compiler output itself. For a single-user VPS running many small projects, the simplicity is worth it.

Daily usage
Nothing to remember — it's all automatic:


bash
git clone git@github.com:hmziqagent/project.git
cd project
cargo build
````

```
Project-scoped tmux sessions
The last piece of friction on the VPS was tmux chaos — a dozen detached sessions with names like 0, 1, dev, dev2, no idea which belongs to which project. I wanted a tiny manager that namespaces sessions per-project with zero ceremony, so I wrote one as a single Bash script: tm.

It does one thing: every session it creates is named <project>__<slot>, rooted at the repo. Run it inside any git repo:


bash
tm            # create/attach <project>__main
tm claude     # create/attach <project>__claude
tm server     # create/attach <project>__server
tm ls         # list only this project's sessions
tm kill claude  # kill one slot
tm name       # print the resolved project name
How it works
Project name comes from the git toplevel's basename (my-app, llmproxy, etc.), lowercased and stripped to alphanumerics so it's always a valid tmux session suffix.
Optional override — drop a devmux.toml in the repo root to force a name:

toml
name = "llmproxy"
Useful when the directory name is ugly but you want clean session labels.
Attach-or-create uses tmux new-session -A, so tm claude attaches if <project>__claude exists, otherwise creates it. No "is it already running?" checks needed.
tm ls greps tmux list-sessions for the current project's prefix, so you only ever see your own sessions — no noise from other projects.
No daemon, no config dir, no state files. One script at ~/.local/bin/tm, depends only on tmux and git.
Why a script instead of a tmux plugin
I looked at the usual session managers (tmuxinator, zellij, etc.) and they all wanted a config file per project, a YAML schema, or a runtime. For "I want claude and server windows scoped to this repo," a 50-line Bash script does the job and survives any box that has tmux installed.

Editor integration
For VS Code Remote, set it as the default terminal so every new integrated terminal drops into a project-scoped session:


json
{
  "terminal.integrated.profiles.linux": {
    "tm": { "path": "/home/axent/.local/bin/tm" }
  },
  "terminal.integrated.defaultProfile.linux": "tm"
}
Zed and plain terminals just run tm / tm claude directly.

A naming note
I originally called it dx, but that collides with the dioxus-cli alias in Rust projects — so it's tm now. Worth mentioning if anyone copies this: pick a short name that doesn't shadow a tool you already use.

Daily flow

bash
git clone git@github.com:hmziqagent/project.git
cd project
tm           # main window, rooted at repo
tm server    # spin up the dev server in a second session
tm claude    # third session for an agent
tm ls        # project__main, project__server, project__claude
Every session is rooted at the repo (via -c "$root"), so you never have to cd back after switching windows. That's the whole pitch: one command per context, automatically scoped.

```



Things I did on my MacBook:
Created a ssh config alias to easily connect to the VPS.

Also I installed termius on my mobile to manage my agents via mobile. This was such a breeze to set it up. Now I don't even require my laptop to manage agents. Only thing which annoys me is I can't use voice to text via my google keyboard on my mobile. not sure why it's disabled probably a paywall feature. 


Conclusion:
This endeavour was so annoying to setup as I had to setup 3 vpses and configure them all the same way.
All I had to do was setup one vps remeber what I did and take notes and finally asked AI about what I did and I compiled all of these steps together into a one document and setup other 2 vpses in via AI with very minimal input required like install tools via sudo and setup ssh and gpg for my github agent account. Now all of this juggling through vpses and my adhd brain made me dive into the read about setup automation and I discovered ansible and it's shenanigans of License issues and it's not easy to learn and neither it's my area of interest I like building software so I got the idea for building toride.dev It's not completely clear what It would look like But the vision is to have a simple tool to manage VPS easy and not have to remember every command and path. like initially I would like it to have automating setup of tools, ssh, fail2bain, and other things that I did on my vpses. and provide a nice TUI for managing these configurations in a nice way instead of juggling in terminal.

And what about my MacBook?
Doing all of this and shifting my development env to VPS has darastically improved my quality of life so much as I don't have to sit with power brick. It's the same experience when I first got my Macbook M1 It was such a strong nostalgic feeling for charging my Macbook only once a day. and Now it's back I had to only charge my macbook once a day. and don't have to worry about it going to sleep and pausing my AI agents and final won't have to worry about rust killing my SSD.

Again is this a perfect solution? Definitely not. it's a compromise. sshing into vps isn't a good experience as my closest vps is in germany and it has 120ms and my US vps go as far as 300ms. So I picked my poison to be ping, instead of burnning hot mac with less battery than a 8 year old laptop.

During this whole journey I also developed two new tools to help with on my agentic journey.
wake (wake.freeoxide.com): Prevents your laptop from sleeping so your agents can run without interruption.
tunnel (tunnel.freeoxide.com): A simple wrapper tool over cloudflared to create a secure tunnel to your VPS without having to remember all the ssh commands and configurations. Runs on background on default so your terminal is always clean and a built in axum server.
