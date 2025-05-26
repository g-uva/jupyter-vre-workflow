import React from 'react';
import AddButton from '../components/AddButton';
import CreateChartDialog from '../dialog/CreateChartDialog';
import ChartWrapper from '../components/ChartWrapper';
import { Grid2 } from '@mui/material';
import GoBackButton from '../components/GoBackButton';

const CONFIG_BASE_URL = 'http://localhost:3000/';
const DEFAULT_SRC_IFRAME = `${CONFIG_BASE_URL}d-solo/behmsglt2r08wa/memory-and-cpu?orgId=1&from=1743616284487&to=1743621999133&timezone=browser&theme=light&panelId=1&__feature.dashboardSceneSolo`;

interface ICreateIFrame {
  src: string;
  height: number;
  width: number;
  keyId: number;
}

interface IChartsPage {
  handleGoBack: () => void;
}

export default function ChartsPage({ handleGoBack }: IChartsPage) {
  const [iframeMap, setIFrameMap] = React.useState<
    Map<number, React.JSX.Element>
  >(new Map());

  const [createChartOpen, setCreateChartOpen] = React.useState<boolean>(false);

  function handleDeleteIFrame(keyId: number) {
    setIFrameMap(prevMap => {
      const newMap = new Map(prevMap);
      newMap?.delete(keyId);
      return newMap;
    });
  }

  function createIFrame({ src, height, width, keyId }: ICreateIFrame) {
    return (
      <ChartWrapper
        keyId={keyId}
        src={src}
        width={width}
        height={height}
        onDelete={handleDeleteIFrame}
      />
    );
  }

  function createChart(newUrl?: string | null): [number, React.JSX.Element] {
    const newKeyId = Number(
      String(Date.now()) + String(Math.round(Math.random() * 10000))
    );
    const iframe = createIFrame({
      src: newUrl ?? DEFAULT_SRC_IFRAME,
      height: 400,
      width: 600,
      keyId: newKeyId
    });
    return [newKeyId, iframe];
  }

  function handleOpenCreateChartDialog() {
    setCreateChartOpen(true);
  }

  function handleNewMetrics(newMetrics: string[]) {
    const newMap = new Map<number, React.JSX.Element>(iframeMap);

    for (let i = 0; i < newMetrics.length; i++) {
      newMap.set(...createChart(DEFAULT_SRC_IFRAME));
    }

    setIFrameMap(newMap);
    setCreateChartOpen(false);
  }

  function handleSubmitUrl(newUrl?: string | null) {
    const newMap = new Map(iframeMap);
    newMap.set(...createChart(newUrl));
    // setIFrameMap(newMap);
  }

  return (
    <Grid2 sx={{ display: 'flex', flexDirection: 'column' }}>
      <Grid2 sx={{ display: 'flex' }}>
        <GoBackButton handleClick={handleGoBack} />
      </Grid2>

      <AddButton handleClickButton={handleOpenCreateChartDialog} />

      <Grid2 sx={{ display: 'flex', flexDirection: 'row' }}>
        {iframeMap ? iframeMap.values() : null}
      </Grid2>

      <CreateChartDialog
        open={createChartOpen}
        handleClose={(isCancel: boolean) =>
          isCancel && setCreateChartOpen(false)
        }
        sendNewMetrics={handleNewMetrics}
        sendNewUrl={(url: string | null) => handleSubmitUrl(url)}
      />
    </Grid2>
  );
}
