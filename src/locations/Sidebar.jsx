import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Paragraph } from '@contentful/f36-components';
import { /* useCMA, */ useSDK } from '@contentful/react-apps-toolkit';

const Sidebar = () => {
  const sdk = useSDK();

  const [childChanged, setChildChanged] = useState(false)

  const linkFields = useMemo(() => {
    return sdk.contentType.fields.filter(f => f.type === 'Link' && f.linkType === 'Entry')
  }, [sdk.contentType])
  const linkArrayFields = useMemo(() => {
    return sdk.contentType.fields.filter(f => f.type === 'Array' && f.items.type === 'Link' && f.items.linkType === 'Entry')
  }, [sdk.contentType])
  const firstSysVersion = useMemo(() => {
    return sdk.entry.getSys().version
  }, [sdk.entry])

  const calculateChildren = useCallback(() => {
    let entries = []
    linkFields.forEach(f => {
      entries = [...entries, sdk.entry.fields[f.id].getValue()]
    })
    linkArrayFields.forEach(f => {
      entries = [...entries, ...sdk.entry.fields[f.id].getValue()]
    })

    return entries
  }, [sdk.entry.fields, linkFields, linkArrayFields])

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.type !== "message" || typeof e.data === 'object') return

      if (e.data.includes("entry-") && e.data.includes(" changed")) {
        let childEntries = calculateChildren()
        const eventEntryId = e.data.split(' ')[0].split('-')[1]
        if (childEntries.map(e => e.sys.id).includes(eventEntryId)) {
          setChildChanged(true)
        }
      }
    }

    window.addEventListener("message", handleMessage)

    return () => window.removeEventListener("message", handleMessage)
  }, [calculateChildren])

  useEffect(() => {
    return sdk.entry.onSysChanged((e) => {
      if (firstSysVersion === e.version) return

      window.postMessage(`entry-${sdk.ids.entry} changed`, "*")
      for (let i = 0; i < window.parent.length; i++) {
        window.parent[i].postMessage(`entry-${sdk.ids.entry} changed`, "*")
      }
    })
  }, [sdk.entry, sdk.ids, firstSysVersion])

  return <Paragraph>Children Changed? {childChanged ? "true" : "false"}</Paragraph>;
};

export default Sidebar;
