# Scripts used in the iOS App Scriptable to create widgets working with obsidian
Initial idea from here. https://www.reddit.com/r/ObsidianMD/comments/1btucgc/obsidian_tasks_widget_on_ios/

## For obsidian.js
Widget will show task that are not done and due today.

All you need to do is to change 'NAME_OF_YOU_VAULT' in line 2 to the name of your vault.
And change "obsidian"  in line 5 to the name of your Scriptable bookmark that should point to your vault.

I add "#task" automatically by the tasks plugin to my tasks. Therefore im Filtering for "- [ ] #task" in line 29. Also im slicing after 11 charakters in line 47 and 49. If you dont use the #task tag or youre using a different one like #todo, these are the lines you have to modify.
