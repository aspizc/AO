/* $OpenBSD$ */

/*
 * Copyright (c) 2026 agents-orchestrator contributors
 *
 * Permission to use, copy, modify, and distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

#include <sys/types.h>

#include <limits.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "tmux.h"

#define AGENTS_CAPTURE_GENERATION "AGENTS_TMUX_GENERATION_ID"
#define AGENTS_CAPTURE_HISTORY 400

static enum cmd_retval	cmd_agents_capture_exec(struct cmd *,
			    struct cmdq_item *);

const struct cmd_entry cmd_agents_capture_entry = {
	.name = "agents-capture-v1",
	.alias = NULL,

	.args = { "g:H:p:r:s:t:x:y:", 0, 0, NULL },
	.usage = "-g generation -r server-pid -s session-id "
		 "-p pane-pid -x width -y height -H history-limit "
		 CMD_TARGET_PANE_USAGE,

	.target = { 't', CMD_FIND_PANE, 0 },

	.flags = 0,
	.exec = cmd_agents_capture_exec
};

static int
cmd_agents_capture_generation(const char *value)
{
	size_t	i;

	if (value == NULL || strlen(value) != 64)
		return (0);
	for (i = 0; i < 64; i++) {
		if ((value[i] < '0' || value[i] > '9') &&
		    (value[i] < 'a' || value[i] > 'f'))
			return (0);
	}
	return (1);
}

static char *
cmd_agents_capture_append(char *buf, size_t *len, const char *line,
    size_t linelen)
{
	buf = xrealloc(buf, *len + linelen + 1);
	memcpy(buf + *len, line, linelen);
	*len += linelen;
	buf[*len] = '\0';
	return (buf);
}

static char *
cmd_agents_capture_history(struct window_pane *wp, size_t *len)
{
	struct grid			*gd = wp->base.grid;
	const struct grid_line		*gl;
	struct screen			*s = &wp->base;
	struct grid_cell		*gc = NULL;
	u_int				 i, sx, top, bottom;
	char				*buf, *line;
	size_t				 linelen;

	sx = screen_size_x(s);
	if (gd->hsize > AGENTS_CAPTURE_HISTORY)
		top = gd->hsize - AGENTS_CAPTURE_HISTORY;
	else
		top = 0;
	bottom = gd->hsize + gd->sy - 1;

	buf = xstrdup("");
	for (i = top; i <= bottom; i++) {
		line = grid_string_cells(gd, 0, i, sx, &gc, 0, s);
		linelen = strlen(line);
		buf = cmd_agents_capture_append(buf, len, line, linelen);
		gl = grid_peek_line(gd, i);
		if (gl != NULL)
			buf[(*len)++] = '\n';
		free(line);
	}
	return (buf);
}

static char *
cmd_agents_capture_hex(const char *buf, size_t len)
{
	static const char	digits[] = "0123456789abcdef";
	char			*hex;
	size_t			 i;

	hex = xmalloc((len * 2) + 1);
	for (i = 0; i < len; i++) {
		hex[i * 2] = digits[((u_char)buf[i]) >> 4];
		hex[(i * 2) + 1] = digits[((u_char)buf[i]) & 0xf];
	}
	hex[len * 2] = '\0';
	return (hex);
}

static enum cmd_retval
cmd_agents_capture_exec(struct cmd *self, struct cmdq_item *item)
{
	struct args			*args = cmd_get_args(self);
	struct cmd_find_state		*target = cmdq_get_target(item);
	struct client			*c = cmdq_get_client(item);
	struct session			*s = target->s;
	struct window_pane		*wp = target->wp;
	struct environ_entry		*envent;
	const char			*g, *expected_session;
	char				*actual_session, *capture, *hex, *cause;
	size_t				 capture_len = 0;
	long long			 server_pid, pane_pid, width, height;
	long long			 history_limit, actual_history_limit;
	struct grid			*gd;

	if (c == NULL || (c->flags & CLIENT_CONTROL) == 0 ||
	    s == NULL || wp == NULL ||
	    !args_has(args, 'g') || !args_has(args, 'r') ||
	    !args_has(args, 's') || !args_has(args, 'p') ||
	    !args_has(args, 'x') || !args_has(args, 'y') ||
	    !args_has(args, 'H')) {
		cmdq_error(item, "agents-capture-v1 binding mismatch");
		return (CMD_RETURN_ERROR);
	}

	g = args_get(args, 'g');
	expected_session = args_get(args, 's');
	envent = environ_find(c->environ, AGENTS_CAPTURE_GENERATION);
	if (!cmd_agents_capture_generation(g) || envent == NULL ||
	    envent->value == NULL || strcmp(envent->value, g) != 0) {
		cmdq_error(item, "agents-capture-v1 binding mismatch");
		return (CMD_RETURN_ERROR);
	}

	cause = NULL;
	server_pid = args_strtonum(args, 'r', 2, LLONG_MAX, &cause);
	if (cause != NULL)
		goto mismatch;
	pane_pid = args_strtonum(args, 'p', 2, LLONG_MAX, &cause);
	if (cause != NULL)
		goto mismatch;
	width = args_strtonum(args, 'x', 1, LLONG_MAX, &cause);
	if (cause != NULL)
		goto mismatch;
	height = args_strtonum(args, 'y', 1, LLONG_MAX, &cause);
	if (cause != NULL)
		goto mismatch;
	history_limit = args_strtonum(args, 'H', 0, LLONG_MAX, &cause);
	if (cause != NULL)
		goto mismatch;

	xasprintf(&actual_session, "$%u", s->id);
	actual_history_limit = options_get_number(s->options, "history-limit");
	if (server_pid != getpid() ||
	    strcmp(expected_session, actual_session) != 0 ||
	    pane_pid != wp->pid ||
	    width != screen_size_x(&wp->base) ||
	    height != screen_size_y(&wp->base) ||
	    history_limit != actual_history_limit ||
	    width != 120 || height != 40 ||
	    history_limit != AGENTS_CAPTURE_HISTORY) {
		free(actual_session);
		goto mismatch_without_cause;
	}

	gd = wp->base.grid;
	capture = cmd_agents_capture_history(wp, &capture_len);
	hex = cmd_agents_capture_hex(capture, capture_len);
	cmdq_print(item,
	    "agents-capture-v1\t1\t%s\t%lld\t%s\t%%%u\t%lld\t%lld\t%lld"
	    "\t%lld\t%u\t%u\t%s",
	    g, server_pid, actual_session, wp->id, pane_pid, width, height,
	    history_limit, gd->hsize, wp->base.cy, hex);
	free(hex);
	free(capture);
	free(actual_session);
	return (CMD_RETURN_NORMAL);

mismatch:
	free(cause);
mismatch_without_cause:
	cmdq_error(item, "agents-capture-v1 binding mismatch");
	return (CMD_RETURN_ERROR);
}
