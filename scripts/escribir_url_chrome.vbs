Set WshShell = WScript.CreateObject("WScript.Shell")
If WScript.Arguments.Count = 0 Then WScript.Quit 1
url = WScript.Arguments(0)

activated = WshShell.AppActivate("Google Chrome")
If Not activated Then
    activated = WshShell.AppActivate("Chrome")
End If
WScript.Sleep 400

WshShell.SendKeys "^l"
WScript.Sleep 400

For i = 1 To Len(url)
    ch = Mid(url, i, 1)
    If InStr("+^%~()[]{}", ch) > 0 Then
        WshShell.SendKeys "{" & ch & "}"
    Else
        WshShell.SendKeys ch
    End If
    WScript.Sleep 45
Next

WScript.Sleep 400
WshShell.SendKeys "~"